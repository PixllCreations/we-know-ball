package teams

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestEncodeParseTeamsRoundTrip(t *testing.T) {
	want := []TeamRef{
		{
			ID:               "1",
			Abbreviation:     "LAL",
			DisplayName:      "Los Angeles Lakers",
			ShortDisplayName: "Lakers",
			Logo:             "https://example.com/lakers.png",
		},
		{
			ID:               "2",
			Abbreviation:     "BOS",
			DisplayName:      "Boston Celtics",
			ShortDisplayName: "Celtics",
		},
	}

	encoded, err := encodeTeams(want)
	if err != nil {
		t.Fatalf("encodeTeams() error = %v", err)
	}

	got, err := parseTeams(string(encoded))
	if err != nil {
		t.Fatalf("parseTeams() error = %v", err)
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("parseTeams() = %#v, want %#v", got, want)
	}
}

func TestParseTeamsInvalidJSONWrapsErrUnmarshal(t *testing.T) {
	_, err := parseTeams("{")
	if !errors.Is(err, ErrUnmarshal) {
		t.Fatalf("parseTeams() error = %v, want ErrUnmarshal", err)
	}
}

func TestTeamCacheGetTeamsCacheMiss(t *testing.T) {
	cache, cleanup := newTestCache(t)
	defer cleanup()

	_, err := cache.GetTeams(context.Background())
	if !errors.Is(err, ErrCacheMiss) {
		t.Fatalf("GetTeams() error = %v, want ErrCacheMiss", err)
	}
}

func TestTeamCacheSetAndGetTeams(t *testing.T) {
	cache, cleanup := newTestCache(t)
	defer cleanup()

	want := []TeamRef{
		{ID: "1", DisplayName: "Los Angeles Lakers"},
		{ID: "2", DisplayName: "Boston Celtics"},
	}

	if err := cache.SetTeams(context.Background(), want); err != nil {
		t.Fatalf("SetTeams() error = %v", err)
	}

	got, err := cache.GetTeams(context.Background())
	if err != nil {
		t.Fatalf("GetTeams() error = %v", err)
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("GetTeams() = %#v, want %#v", got, want)
	}
}

func TestTeamCacheGetTeam(t *testing.T) {
	cache, cleanup := newTestCache(t)
	defer cleanup()

	teams := []TeamRef{
		{ID: "1", DisplayName: "Los Angeles Lakers"},
		{ID: "2", DisplayName: "Boston Celtics"},
	}

	if err := cache.SetTeams(context.Background(), teams); err != nil {
		t.Fatalf("SetTeams() error = %v", err)
	}

	got, err := cache.GetTeam(context.Background(), "2")
	if err != nil {
		t.Fatalf("GetTeam() error = %v", err)
	}

	if got.ID != "2" {
		t.Fatalf("GetTeam() ID = %q, want %q", got.ID, "2")
	}

	_, err = cache.GetTeam(context.Background(), "3")
	if !errors.Is(err, ErrTeamNotFound) {
		t.Fatalf("GetTeam() error = %v, want ErrTeamNotFound", err)
	}
}

func newTestCache(t *testing.T) (*TeamCache, func()) {
	t.Helper()

	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{
		Addr: server.Addr(),
	})

	cache := NewCache(client)
	cache.ttl = time.Hour

	return cache, func() {
		if err := client.Close(); err != nil {
			t.Fatalf("redis client close error = %v", err)
		}
		server.Close()
	}
}
