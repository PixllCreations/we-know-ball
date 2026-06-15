package teams

import (
	"context"
	"errors"
	"log"

	"github.com/PixllCreations/we-know-ball/backend/cache"
	"github.com/PixllCreations/we-know-ball/backend/games"
)

type Service struct {
	teamCache *TeamCache
	gameCache *games.GameCache
	fetcher   Fetcher
}

func NewService(teamCache *TeamCache, gameCache *games.GameCache, fetcher Fetcher) *Service {
	return &Service{
		teamCache: teamCache,
		gameCache: gameCache,
		fetcher:   fetcher,
	}
}

/*
==========================

	Teams API

==========================
*/

func (ts *Service) GetTeams(ctx context.Context) ([]Team, error) {
	cached, err := ts.teamCache.GetTeams(ctx)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching teams from upstream")

			fetched, err := ts.fetcher.FetchTeams(ctx)
			if err != nil {
				return nil, err
			}

			if err := ts.teamCache.SetTeams(ctx, fetched); err != nil {
				log.Printf("failed to set teams in cache: %v", err)
			}

			return fetched, nil
		}
		return nil, err
	}

	log.Println("cache hit, returning cached teams")
	return cached, nil
}

func (ts *Service) GetTeam(ctx context.Context, id string) (Team, error) {
	teams, err := ts.GetTeams(ctx)
	if err != nil {
		return Team{}, err
	}

	for _, team := range teams {
		if team.ID == id {
			return team, nil
		}
	}

	return Team{}, ErrTeamNotFound
}

/*
==========================

	Team Roster API

==========================
*/

func (ts *Service) GetRoster(ctx context.Context, id string) ([]Player, error) {
	cached, err := ts.teamCache.GetRoster(ctx, id)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching roster from upstream")
			fetched, err := ts.fetcher.FetchRoster(ctx, id)
			if err != nil {
				return nil, err
			}
			if err := ts.teamCache.SetRoster(ctx, id, fetched); err != nil {
				log.Printf("failed to set roster in cache: %v", err)
			}
			return fetched, nil
		}
		return nil, err
	}
	log.Println("cache hit, returning cached roster")
	return cached, nil
}

/*
==========================

	Team Schedule API

==========================
*/

func (ts *Service) GetSchedule(ctx context.Context, id string) ([]games.Game, error) {
	cached, err := ts.gameCache.GetTeamGames(ctx, id)

	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching schedule from upstream")
			fetched, err := ts.fetcher.FetchSchedule(ctx, id)
			if err != nil {
				return nil, err
			}
			if err := ts.gameCache.SetTeamGames(ctx, id, fetched); err != nil {
				log.Printf("failed to set schedule in cache: %v", err)
			}
			return fetched, nil
		}
	}
	log.Println("cache hit, returning cached schedule")
	return cached, nil
}
