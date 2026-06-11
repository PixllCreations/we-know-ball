package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

type TeamRef struct {
	ID               string `json:"id"`
	Abbreviation     string `json:"abbreviation"`
	DisplayName      string `json:"displayName"`
	ShortDisplayName string `json:"shortDisplayName"`
	Name             string `json:"name,omitempty"`
	Location         string `json:"location,omitempty"`
	Color            string `json:"color,omitempty"`
	AlternateColor   string `json:"alternateColor,omitempty"`
	Logo             string `json:"logo,omitempty"`
	Logos            []Logo `json:"logos,omitempty"`
	Record           string `json:"record,omitempty"`
}

const ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"

type Logo struct {
	Href string `json:"href"`
}

type Reference struct {
	Ref string `json:"$ref"`
}

type TeamsResponse struct {
	Sports []Sport `json:"sports"`
}

type Sport struct {
	ID      string   `json:"id"`
	Leagues []League `json:"leagues"`
}

type League struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Abbreviation string      `json:"abbreviation"`
	ShortName    string      `json:"shortName"`
	Teams        []TeamEntry `json:"teams"`
}

type TeamEntry struct {
	Team TeamRef `json:"team"`
}

type TeamService struct {
	redis *redis.Client
	http  *http.Client
}

func NewTeamService(redis *redis.Client) *TeamService {
	return &TeamService{
		redis: redis,
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func parseTeams(data []byte) ([]TeamRef, error) {
	var teams []TeamRef

	if err := json.Unmarshal(data, &teams); err != nil {
		return nil, fmt.Errorf("failed to unmarshal teams: %w", err)
	}

	return teams, nil
}

func parseTeam(data []byte) (TeamRef, error) {
	var team TeamRef

	if err := json.Unmarshal(data, &team); err != nil {
		return TeamRef{}, fmt.Errorf("failed to unmarshal team: %w", err)
	}

	return team, nil
}

func encodeTeams(teams []TeamRef) ([]byte, error) {
	return json.Marshal(teams)
}

func encodeTeam(team TeamRef) ([]byte, error) {
	return json.Marshal(team)
}

func (ts *TeamService) fetchTeams() ([]TeamRef, error) {
	response, err := http.Get(ESPN_TEAMS_URL)
	if err != nil {
		// TODO: Use error types to narrow the error
		return nil, err
	}
	defer response.Body.Close()

	var data TeamsResponse
	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		// TODO: Use error types to narrow the error
		return nil, err

	}

	entries := data.Sports[0].Leagues[0].Teams

	teams := make([]TeamRef, 0, len(entries))
	for _, entry := range entries {
		team := entry.Team

		if team.Logo == "" && len(team.Logos) > 0 {
			team.Logo = team.Logos[0].Href
		}

		teams = append(teams, team)
	}

	return teams, nil
}

func (ts *TeamService) GetTeams(ctx context.Context) ([]TeamRef, error) {
	key := "teams"

	cached, err := ts.redis.Get(ctx, key).Result()

	if errors.Is(err, redis.Nil) {
		teams, err := ts.fetchTeams()
		if err != nil {
			// TODO: Use error types to narrow the error
			return nil, err
		}

		marshalled, err := json.Marshal(teams)
		if err != nil {
			fmt.Errorf("failed to marshal teams: %w", err)
			return teams, err
		}

		if err := ts.redis.Set(ctx, key, marshalled, 1*time.Hour).Err(); err != nil {
			fmt.Errorf("failed to set teams in redis: %w", err)
			// TODO: Use error types to narrow the error
			return teams, err
		}

		return teams, nil
	}

	if err != nil {
		// TODO: Use error types to narrow the error
		return nil, err
	}

	if err := json.Unmarshal([]byte(cached), &teams); err != nil {

	}

}
func (ts *TeamService) GetTeam(id string) (TeamRef, error) {
	url := fmt.Sprintf("%s/%s", ESPN_TEAMS_URL, id)

	response, err := http.Get(url)
	if err != nil {
		// TODO: Use error types to narrow the error
		return TeamRef{}, err
	}

	defer response.Body.Close()

	var team TeamRef
	if err := json.NewDecoder(response.Body).Decode(&team); err != nil {
		// TODO: Use error types to narrow the error
		return TeamRef{}, err
	}

	return team, nil
}
