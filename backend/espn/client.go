package espn

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/teams"
)

const defaultBaseURL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"

type Client struct {
	http    *http.Client
	baseURL string
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseURL: defaultBaseURL,
	}
}

func (c *Client) FetchTeams(ctx context.Context) ([]teams.TeamRef, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL, nil)
	if err != nil {
		return nil, err
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", response.StatusCode)
	}

	var data teamsResponse
	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		return nil, err
	}

	if len(data.Sports) == 0 || len(data.Sports[0].Leagues) == 0 {
		return nil, errors.New("no sports or leagues found")
	}

	entries := data.Sports[0].Leagues[0].Teams
	if len(entries) == 0 {
		return nil, errors.New("no teams found")
	}

	result := make([]teams.TeamRef, 0, len(entries))
	for _, entry := range entries {
		team := entry.Team
		if team.Logo == "" && len(team.Logos) > 0 {
			team.Logo = team.Logos[0].Href
		}
		result = append(result, team)
	}

	return result, nil
}

func (c *Client) FetchRoster(ctx context.Context, teamID string) ([]teams.PlayerRef, error) {
	url := fmt.Sprintf("%s/%s/roster", c.baseURL, teamID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", response.StatusCode)
	}

	var data rosterResponse
	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data.Athletes, nil
}

func (c *Client) FetchSchedule(ctx context.Context, teamID string) ([]teams.GameRef, error) {
	url := fmt.Sprintf("%s/%s/schedule", c.baseURL, teamID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	response, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", response.StatusCode)
	}

	var data scheduleResponse
	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		return nil, err
	}

	return data.Events, nil
}
