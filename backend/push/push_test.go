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
		name  string
		watch watch
		game  games.Game
		want  string
	}{
		{"tipoff is first quarter", watch{Phase: 0, Period: 0}, games.Game{State: "in", Period: 1}, "Tipoff"},
		{"second quarter", watch{Phase: 1, Period: 1}, games.Game{State: "in", Period: 2}, "Second quarter"},
		{"halftime", watch{Phase: 1, Period: 2}, games.Game{State: "in", StatusCode: "STATUS_HALFTIME", Period: 2}, "Halftime"},
		{"third quarter", watch{Phase: 2, Period: 2}, games.Game{State: "in", Period: 3}, "Third quarter"},
		{"fourth quarter", watch{Phase: 3, Period: 3}, games.Game{State: "in", Period: 4}, "Fourth quarter"},
		{"stopped clock is not halftime", watch{Phase: 1, Period: 2}, games.Game{State: "in", Period: 2, Clock: 0}, ""},
		{"skipped state reports current quarter", watch{Phase: 1, Period: 1}, games.Game{State: "in", Period: 3}, "Third quarter"},
		{"final", watch{Phase: 3, Period: 4}, games.Game{State: "post", Period: 4, Completed: true}, "Final score"},
		{"cancelled", watch{Phase: 1, Period: 1}, games.Game{State: "post", StatusCode: "STATUS_CANCELED"}, ""},
		{"same snapshot", watch{Phase: 2, Period: 2}, games.Game{State: "in", StatusCode: "STATUS_HALFTIME", Period: 2}, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := event(c.watch, c.game); got != c.want {
				t.Fatalf("got %q want %q", got, c.want)
			}
		})
	}
}

func TestLibrarySubscriberAvoidsDoubleMailtoPrefix(t *testing.T) {
	if got := librarySubscriber("mailto:user@example.com"); got != "user@example.com" {
		t.Fatalf("got %q", got)
	}
	if got := librarySubscriber("https://example.com"); got != "https://example.com" {
		t.Fatalf("got %q", got)
	}
}
func TestDeliveryRetryDedupAndCleanup(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	f := &fakeFetcher{game: games.Game{ID: "1", State: "in", Period: 1}}
	s := &Service{rdb: rdb, fetcher: f}
	ctx := context.Background()
	raw, _ := json.Marshal(watch{GameID: "1", Version: watchVersion, Phase: 0})
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

func TestQuarterLifecycle(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	ctx := context.Background()
	key := "push:watch:1:device"
	raw, _ := json.Marshal(watch{GameID: "1", Version: watchVersion})
	rdb.Set(ctx, key, raw, watchTTL)
	f := &fakeFetcher{}
	s := &Service{rdb: rdb, fetcher: f}
	var titles []string
	s.send = func(_ context.Context, payload []byte, _ *webpush.Subscription) (int, error) {
		var message map[string]string
		if err := json.Unmarshal(payload, &message); err != nil {
			t.Fatal(err)
		}
		titles = append(titles, message["title"])
		return 201, nil
	}
	steps := []games.Game{
		{ID: "1", ShortName: "AWY @ HOM", State: "in", Period: 1},
		{ID: "1", ShortName: "AWY @ HOM", State: "in", Period: 2},
		{ID: "1", ShortName: "AWY @ HOM", State: "in", Period: 2, StatusCode: "STATUS_HALFTIME"},
		{ID: "1", ShortName: "AWY @ HOM", State: "in", Period: 3},
		{ID: "1", ShortName: "AWY @ HOM", State: "in", Period: 4},
		{ID: "1", ShortName: "AWY @ HOM", State: "post", Period: 4, Completed: true},
	}
	for _, game := range steps {
		f.game = game
		s.poll(ctx)
		mr.FastForward(30 * time.Second)
	}
	want := []string{
		"Tipoff · AWY @ HOM",
		"Second quarter · AWY @ HOM",
		"Halftime · AWY @ HOM",
		"Third quarter · AWY @ HOM",
		"Fourth quarter · AWY @ HOM",
		"Final score · AWY @ HOM",
	}
	if fmt.Sprint(titles) != fmt.Sprint(want) {
		t.Fatalf("got %v want %v", titles, want)
	}
	if rdb.Exists(ctx, key).Val() != 0 {
		t.Fatal("completed watch not removed")
	}
}

func TestLegacyWatchMigratesWithoutQuarterAlert(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	ctx := context.Background()
	key := "push:watch:1:device"
	raw, _ := json.Marshal(watch{GameID: "1", Phase: 1})
	rdb.Set(ctx, key, raw, watchTTL)
	s := &Service{rdb: rdb, fetcher: &fakeFetcher{game: games.Game{ID: "1", State: "in", Period: 2}}}
	deliveries := 0
	s.send = func(context.Context, []byte, *webpush.Subscription) (int, error) {
		deliveries++
		return 201, nil
	}
	s.poll(ctx)
	if deliveries != 0 {
		t.Fatal("legacy watch received a false quarter alert")
	}
	var migrated watch
	if err := json.Unmarshal([]byte(rdb.Get(ctx, key).Val()), &migrated); err != nil {
		t.Fatal(err)
	}
	if migrated.Version != watchVersion || migrated.Period != 2 {
		t.Fatalf("watch not migrated: %+v", migrated)
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
			raw, _ := json.Marshal(watch{GameID: "1", Version: watchVersion, Phase: 0})
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
