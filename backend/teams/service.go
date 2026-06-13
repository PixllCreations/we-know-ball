package teams

import (
	"context"
	"errors"
	"log"
)

type TeamService struct {
	cache   *TeamCache
	fetcher Fetcher
}

func NewService(cache *TeamCache, fetcher Fetcher) *TeamService {
	return &TeamService{
		cache:   cache,
		fetcher: fetcher,
	}
}

/*
==========================

	Teams API

==========================
*/

func (ts *TeamService) GetTeams(ctx context.Context) ([]TeamRef, error) {
	cached, err := ts.cache.GetTeams(ctx)
	if err != nil {
		if errors.Is(err, ErrCacheMiss) {
			log.Println("cache miss, fetching teams from upstream")

			fetched, err := ts.fetcher.FetchTeams(ctx)
			if err != nil {
				return nil, err
			}

			if err := ts.cache.SetTeams(ctx, fetched); err != nil {
				log.Printf("failed to set teams in cache: %v", err)
			}

			return fetched, nil
		}
		return nil, err
	}

	log.Println("cache hit, returning cached teams")
	return cached, nil
}

func (ts *TeamService) GetTeam(ctx context.Context, id string) (TeamRef, error) {
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

/*
==========================

	Team Roster API

==========================
*/

func (ts *TeamService) GetRoster(ctx context.Context, id string) ([]PlayerRef, error) {
	return ts.fetcher.FetchRoster(ctx, id)
}

/*
==========================

	Team Schedule API

==========================
*/

func (ts *TeamService) GetSchedule(ctx context.Context, id string) ([]GameRef, error) {
	return ts.fetcher.FetchSchedule(ctx, id)
}
