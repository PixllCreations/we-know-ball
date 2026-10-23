package push

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/games"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type fakeFetcher struct{ game games.Game }

func (f *fakeFetcher) FetchGame(context.Context, string) (games.Game, error)         { return f.game, nil }
func (f *fakeFetcher) FetchScoreboard(context.Context, string) ([]games.Game, error) { return nil, nil }
func TestEvents(t *testing.T) {
	cases := []struct {
		name   string
		before int
		game   games.Game
		want   string
	}{
		{"tipoff", 0, games.Game{State: "in", Period: 1}, "Tipoff"},
		{"halftime", 1, games.Game{State: "in", StatusCode: "STATUS_HALFTIME", Period: 2}, "Halftime"},
		{"stopped clock is not halftime", 1, games.Game{State: "in", Period: 2, Clock: 0}, ""},
		{"second half skips late tipoff", 0, games.Game{State: "in", Period: 3}, ""},
		{"final", 3, games.Game{State: "post", Completed: true}, "Final score"},
		{"cancelled", 1, games.Game{State: "post", StatusCode: "STATUS_CANCELED"}, ""},
		{"same snapshot", 2, games.Game{State: "in", StatusCode: "STATUS_HALFTIME"}, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := event(c.before, c.game); got != c.want {
				t.Fatalf("got %q want %q", got, c.want)
			}
		})
	}
}
func TestDeliveryRetryDedupAndCleanup(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	f := &fakeFetcher{game: games.Game{ID: "1", State: "in", Period: 1}}
	s := &Service{rdb: rdb, fetcher: f}
	ctx := context.Background()
	raw, _ := json.Marshal(watch{GameID: "1", Phase: 0})
	key := "push:watch:1:device"
	rdb.Set(ctx, key, raw, watchTTL)
	attempts := 0
	s.send = func(context.Context, []byte, *webpush.Subscription) (int, error) {
		attempts++
		if attempts == 1 {
			return 0, errors.New("offline")
		}
		return 201, nil
	}
	s.poll(ctx)
	mr.FastForward(30 * time.Second)
	s.poll(ctx)
	mr.FastForward(30 * time.Second)
	s.poll(ctx)
	if attempts != 2 {
		t.Fatalf("expected failed send and one retry, got %d", attempts)
	}
	f.game.Completed = true
	f.game.State = "post"
	mr.FastForward(30 * time.Second)
	s.poll(ctx)
	if attempts != 3 {
		t.Fatalf("final not delivered: %d", attempts)
	}
	if rdb.Exists(ctx, key).Val() != 0 {
		t.Fatal("completed watch not cleaned up")
	}
	// Scanning must never create leases for lease keys.
	keys := mr.Keys()
	for _, k := range keys {
		if k == key+":lease:lease" {
			t.Fatal("recursive lease")
		}
	}
}
func TestDisabledWatchCannotBeResurrected(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	ctx := context.Background()
	rdb.Set(ctx, "watch", "old", time.Hour)
	rdb.Del(ctx, "watch")
	updateWatch.Run(ctx, rdb, []string{"watch"}, "old", "new")
	if rdb.Exists(ctx, "watch").Val() != 0 {
		t.Fatal("disabled watch resurrected")
	}
}
func TestSubscriptionRejectsArbitraryEndpoints(t *testing.T) {
	for _, endpoint := range []string{"https://localhost/push", "http://fcm.googleapis.com/a", "https://fcm.googleapis.com.evil.test/a", "https://web.push.apple.com:8443/a"} {
		if validSubscription(webpush.Subscription{Endpoint: endpoint}) {
			t.Fatalf("accepted %s", endpoint)
		}
	}
}

func TestDeliveryErrorsRedactPushEndpoint(t *testing.T) {
	sub := webpush.Subscription{Endpoint: "https://web.push.apple.com/secret-capability"}
	got := safeDeliveryError(errors.New("POST https://web.push.apple.com/secret-capability failed"), sub)
	if got != "POST [push endpoint] failed" {
		t.Fatalf("endpoint was not redacted: %q", got)
	}
}

func TestInvalidSubscriptionsAreRemoved(t *testing.T) {
	for _, status := range []int{401, 403, 404, 410} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			mr := miniredis.RunT(t)
			rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
			defer rdb.Close()
			ctx := context.Background()
			raw, _ := json.Marshal(watch{GameID: "1", Phase: 0})
			rdb.Set(ctx, "push:watch:1:device", raw, watchTTL)
			s := &Service{rdb: rdb, fetcher: &fakeFetcher{game: games.Game{ID: "1", State: "in", Period: 1}}}
			s.send = func(context.Context, []byte, *webpush.Subscription) (int, error) { return status, nil }
			s.poll(ctx)
			if rdb.Exists(ctx, "push:watch:1:device").Val() != 0 {
				t.Fatal("invalid subscription not removed")
			}
		})
	}
}
