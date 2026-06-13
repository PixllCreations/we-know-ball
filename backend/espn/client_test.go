package espn

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func newTestClient(t *testing.T, handler http.Handler) (*Client, func()) {
	t.Helper()

	server := httptest.NewServer(handler)
	client := &Client{
		http:    &http.Client{Timeout: 5 * time.Second},
		baseURL: server.URL,
	}
	return client, server.Close
}

func TestFetchTeamsSuccess(t *testing.T) {
	client, cleanup := newTestClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

	got, err := client.FetchTeams(context.Background())
	if err != nil {
		t.Fatalf("FetchTeams() error = %v", err)
	}

	if len(got) != 1 {
		t.Fatalf("FetchTeams() returned %d teams, want 1", len(got))
	}

	if got[0].ID != "1" {
		t.Fatalf("FetchTeams()[0].ID = %q, want %q", got[0].ID, "1")
	}

	if got[0].Logo != "https://example.com/lakers.png" {
		t.Fatalf("FetchTeams()[0].Logo = %q, want fallback logo", got[0].Logo)
	}
}

func TestFetchTeamsErrors(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		body       string
	}{
		{"non 200 response", http.StatusInternalServerError, `{}`},
		{"missing sports", http.StatusOK, `{}`},
		{"missing leagues", http.StatusOK, `{"sports":[{}]}`},
		{"empty teams", http.StatusOK, `{"sports":[{"leagues":[{"teams":[]}]}]}`},
		{"invalid json", http.StatusOK, `{`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, cleanup := newTestClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
				_, _ = w.Write([]byte(tt.body))
			}))
			defer cleanup()

			if _, err := client.FetchTeams(context.Background()); err == nil {
				t.Fatal("FetchTeams() error = nil, want error")
			}
		})
	}
}

func TestFetchRosterSuccess(t *testing.T) {
	client, cleanup := newTestClient(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/1/roster" {
			t.Fatalf("path = %q, want %q", r.URL.Path, "/1/roster")
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"season": {"year": 2025, "displayName": "2024-25", "type": 2, "name": "Regular Season"},
			"athletes": [
				{"id": "100", "fullName": "LeBron James", "displayName": "L. James", "jersey": "23"}
			]
		}`))
	}))
	defer cleanup()

	got, err := client.FetchRoster(context.Background(), "1")
	if err != nil {
		t.Fatalf("FetchRoster() error = %v", err)
	}

	if len(got) != 1 || got[0].ID != "100" {
		t.Fatalf("FetchRoster() = %#v, want one player", got)
	}
}
