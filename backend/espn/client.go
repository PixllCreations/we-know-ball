package espn

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/games"
	"github.com/PixllCreations/we-know-ball/backend/nba"
	"github.com/PixllCreations/we-know-ball/backend/teams"
)

const (
	SiteV2Base = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
	CoreV2Base = "https://site.api.espn.com/apis/v2/sports/basketball/nba"
)

var (
	_ teams.Fetcher = (*Client)(nil)
	_ games.Fetcher = (*Client)(nil)
	_ nba.Fetcher   = (*Client)(nil)
)

type Client struct {
	http *http.Client
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func joinEndpoint(baseURL, path string) string {
	return strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(path, "/")
}

func (c *Client) get(ctx context.Context, baseURL, path string, query url.Values, target any) error {
	endpoint := joinEndpoint(baseURL, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	if len(query) > 0 {
		req.URL.RawQuery = query.Encode()
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func (c *Client) FetchTeams(ctx context.Context) ([]teams.Team, error) {
	var data TeamsResponse
	if err := c.get(ctx, SiteV2Base, "/teams", nil, &data); err != nil {
		return nil, err
	}

	if len(data.Sports) == 0 || len(data.Sports[0].Leagues) == 0 {
		return nil, errors.New("no sports or leagues found")
	}

	entries := data.Sports[0].Leagues[0].Teams
	if len(entries) == 0 {
		return nil, errors.New("no teams found")
	}

	wire := make([]Team, 0, len(entries))
	for _, entry := range entries {
		wire = append(wire, entry.Team)
	}
	return mapTeams(wire), nil
}

func (c *Client) FetchRoster(ctx context.Context, teamID string) ([]teams.Player, error) {
	var data RosterResponse
	if err := c.get(ctx, SiteV2Base, "/teams/"+teamID+"/roster", nil, &data); err != nil {
		return nil, err
	}
	return mapPlayers(data.Athletes), nil
}

func (c *Client) FetchSchedule(ctx context.Context, teamID string) ([]games.Game, error) {
	var data ScheduleResponse
	if err := c.get(ctx, SiteV2Base, "/teams/"+teamID+"/schedule", nil, &data); err != nil {
		return nil, err
	}
	return mapSchedule(&data), nil
}

// `date` is YYYYMMDD or a YYYYMMDD-YYYYMMDD range
func (c *Client) FetchScoreboard(ctx context.Context, date string) ([]games.Game, error) {
	var query url.Values
	if date != "" {
		query = url.Values{"dates": []string{date}}
	}
	var data ScoreboardResponse
	if err := c.get(ctx, SiteV2Base, "/scoreboard", query, &data); err != nil {
		return nil, err
	}

	return mapScoreboard(&data), nil
}

func (c *Client) FetchGame(ctx context.Context, id string) (games.Game, error) {
	var data SummaryResponse
	if err := c.get(ctx, SiteV2Base, "/summary", url.Values{"event": []string{id}}, &data); err != nil {
		return games.Game{}, err
	}
	return mapSummary(&data), nil
}

func (c *Client) FetchStandings(ctx context.Context) ([]nba.ConferenceStandings, error) {
	var data StandingsResponse
	if err := c.get(ctx, CoreV2Base, "/standings", nil, &data); err != nil {
		return nil, err
	}

	return mapStandings(&data), nil
}

// SaveDebugData is a development helper for capturing raw payloads.
func SaveDebugData(data any, filename string) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filename, jsonData, 0600)
}
