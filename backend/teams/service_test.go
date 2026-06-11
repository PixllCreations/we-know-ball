package teams

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestFetchTeamsSuccess(t *testing.T) {
	service, cleanup := newTestService(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("method = %s, want %s", r.Method, http.MethodGet)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"sports": [{
				"leagues": [{
					"teams": [{
						"team": {
							"id": "1",
							"abbreviation": "LAL",
							"displayName": "Los Angeles Lakers",
							"shortDisplayName": "Lakers",
							"logos": [{"href": "https://example.com/lakers.png"}]
						}
					}]
				}]
			}]
		}`))
	}))
	defer cleanup()

	got, err := service.fetchTeams(context.Background())
	if err != nil {
		t.Fatalf("fetchTeams() error = %v", err)
	}

	if len(got) != 1 {
		t.Fatalf("fetchTeams() returned %d teams, want 1", len(got))
	}

	if got[0].ID != "1" {
		t.Fatalf("fetchTeams()[0].ID = %q, want %q", got[0].ID, "1")
	}

	if got[0].Logo != "https://example.com/lakers.png" {
		t.Fatalf("fetchTeams()[0].Logo = %q, want fallback logo", got[0].Logo)
	}
}

func TestFetchTeamsErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		body       string
	}{
		{
			name:       "non 200 response",
			statusCode: http.StatusInternalServerError,
			body:       `{}`,
		},
		{
			name:       "missing sports",
			statusCode: http.StatusOK,
			body:       `{}`,
		},
		{
			name:       "missing leagues",
			statusCode: http.StatusOK,
			body:       `{"sports":[{}]}`,
		},
		{
			name:       "empty teams",
			statusCode: http.StatusOK,
			body:       `{"sports":[{"leagues":[{"teams":[]}]}]}`,
		},
		{
			name:       "invalid json",
			statusCode: http.StatusOK,
			body:       `{`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service, cleanup := newTestService(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer cleanup()

			if _, err := service.fetchTeams(context.Background()); err == nil {
				t.Fatal("fetchTeams() error = nil, want error")
			}
		})
	}
}

func TestGetTeamsFetchesAndCachesOnMiss(t *testing.T) {
	calls := 0
	service, cleanup := newTestService(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"sports": [{
				"leagues": [{
					"teams": [{
						"team": {
							"id": "1",
							"displayName": "Los Angeles Lakers",
							"shortDisplayName": "Lakers"
						}
					}]
				}]
			}]
		}`))
	}))
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

	if calls != 1 {
		t.Fatalf("handler calls = %d, want 1", calls)
	}
}

func TestGetTeam(t *testing.T) {
	service, cleanup := newTestService(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"sports": [{
				"leagues": [{
					"teams": [
						{"team": {"id": "1", "displayName": "Los Angeles Lakers"}},
						{"team": {"id": "2", "displayName": "Boston Celtics"}}
					]
				}]
			}]
		}`))
	}))
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

func newTestService(t *testing.T, handler http.Handler) (*TeamService, func()) {
	t.Helper()

	redisServer := miniredis.RunT(t)
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisServer.Addr(),
	})

	httpServer := httptest.NewServer(handler)
	service := NewService(redisClient)
	service.http = httpServer.Client()
	service.teamsURL = httpServer.URL

	return service, func() {
		httpServer.Close()
		if err := redisClient.Close(); err != nil {
			t.Fatalf("redis client close error = %v", err)
		}
		redisServer.Close()
	}
}
