package teams

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

type TeamService struct {
	cache    *TeamCache
	http     *http.Client
	teamsURL string
}

func NewService(redis *redis.Client) *TeamService {
	return &TeamService{
		cache: NewCache(redis),
		http: &http.Client{
			Timeout: 10 * time.Second,
		},
		teamsURL: ESPN_TEAMS_URL,
	}
}

func (ts *TeamService) fetchTeams(ctx context.Context) ([]TeamRef, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ts.teamsURL, nil)
	if err != nil {
		return nil, err
	}

	response, err := ts.http.Do(req)
	if err != nil {
		return nil, err
	}

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf(
			"unexpected status code: %d",
			response.StatusCode,
		)
	}
	defer response.Body.Close()

	var data TeamsResponse
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

	cached, err := ts.cache.GetTeams(ctx)
	if err != nil {
		if errors.Is(err, ErrCacheMiss) {

			teams, err := ts.fetchTeams(ctx)

			if err != nil {
				return nil, err
			}

			if err := ts.cache.SetTeams(ctx, teams); err != nil {
				log.Printf("failed to set teams in cache: %v", err)
			}

			return teams, nil
		}
		return nil, err
	}
	return cached, nil
}

func (ts *TeamService) GetTeam(
	ctx context.Context,
	id string,
) (TeamRef, error) {

	teams, err := ts.GetTeams(ctx)
	if err != nil {
		return TeamRef{}, err
	}

	for _, team := range teams {
		if team.ID == id {
			return team, nil
		}
	}

	return TeamRef{}, ErrTeamNotFound
}
