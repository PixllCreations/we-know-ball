package teams

import (
	"context"
	"errors"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type fakeFetcher struct {
	teams         []TeamRef
	roster        []PlayerRef
	schedule      []GameRef
	scheduleErr   error
	teamsErr      error
	rosterErr     error
	teamsCalls    int
	rosterCalls   int
	scheduleCalls int
}

func (f *fakeFetcher) FetchTeams(ctx context.Context) ([]TeamRef, error) {
	f.teamsCalls++
	if f.teamsErr != nil {
		return nil, f.teamsErr
	}
	return f.teams, nil
}

func (f *fakeFetcher) FetchRoster(ctx context.Context, teamID string) ([]PlayerRef, error) {
	f.rosterCalls++
	if f.rosterErr != nil {
		return nil, f.rosterErr
	}
	return f.roster, nil
}

func (f *fakeFetcher) FetchSchedule(ctx context.Context, teamID string) ([]GameRef, error) {
	f.scheduleCalls++
	if f.scheduleErr != nil {
		return nil, f.scheduleErr
	}
	return f.schedule, nil
}

func TestGetTeamsFetchesAndCachesOnMiss(t *testing.T) {
	fetcher := &fakeFetcher{
		teams: []TeamRef{{ID: "1", DisplayName: "Los Angeles Lakers"}},
	}
	service, cleanup := newTestService(t, fetcher)
	defer cleanup()

	for i := 0; i < 2; i++ {
		got, err := service.GetTeams(context.Background())
		if err != nil {
			t.Fatalf("GetTeams() call %d error = %v", i+1, err)
		}

		if len(got) != 1 || got[0].ID != "1" {
			t.Fatalf("GetTeams() call %d = %#v, want team 1", i+1, got)
		}
	}

	if fetcher.teamsCalls != 1 {
		t.Fatalf("FetchTeams calls = %d, want 1", fetcher.teamsCalls)
	}
}

func TestGetTeamsPropagatesFetcherError(t *testing.T) {
	wantErr := errors.New("boom")
	fetcher := &fakeFetcher{teamsErr: wantErr}
	service, cleanup := newTestService(t, fetcher)
	defer cleanup()

	_, err := service.GetTeams(context.Background())
	if !errors.Is(err, wantErr) {
		t.Fatalf("GetTeams() error = %v, want %v", err, wantErr)
	}
}

func TestGetTeam(t *testing.T) {
	fetcher := &fakeFetcher{
		teams: []TeamRef{
			{ID: "1", DisplayName: "Los Angeles Lakers"},
			{ID: "2", DisplayName: "Boston Celtics"},
		},
	}
	service, cleanup := newTestService(t, fetcher)
	defer cleanup()

	got, err := service.GetTeam(context.Background(), "2")
	if err != nil {
		t.Fatalf("GetTeam() error = %v", err)
	}

	if got.ID != "2" {
		t.Fatalf("GetTeam() ID = %q, want %q", got.ID, "2")
	}

	_, err = service.GetTeam(context.Background(), "3")
	if !errors.Is(err, ErrTeamNotFound) {
		t.Fatalf("GetTeam() error = %v, want ErrTeamNotFound", err)
	}
}

func TestGetTeamRoster(t *testing.T) {
	fetcher := &fakeFetcher{
		roster: []PlayerRef{{ID: "100", DisplayName: "LeBron James"}},
	}
	service, cleanup := newTestService(t, fetcher)
	defer cleanup()

	got, err := service.GetRoster(context.Background(), "1")
	if err != nil {
		t.Fatalf("GetTeamRoster() error = %v", err)
	}

	if len(got) != 1 || got[0].ID != "100" {
		t.Fatalf("GetTeamRoster() = %#v, want one player", got)
	}

	if fetcher.rosterCalls != 1 {
		t.Fatalf("FetchRoster calls = %d, want 1", fetcher.rosterCalls)
	}
}

func newTestService(t *testing.T, fetcher Fetcher) (*TeamService, func()) {
	t.Helper()

	redisServer := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisServer.Addr(),
	})

	service := NewService(NewCache(redisClient), fetcher)

	return service, func() {
		if err := redisClient.Close(); err != nil {
			t.Fatalf("redis client close error = %v", err)
		}
		redisServer.Close()
	}
}
