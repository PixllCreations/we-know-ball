package games

import (
	"context"
	"errors"
	"log"

	"github.com/PixllCreations/we-know-ball/backend/cache"
)

type Service struct {
	cache   *GameCache
	fetcher Fetcher
}

func NewService(cache *GameCache, fetcher Fetcher) *Service {
	return &Service{
		cache:   cache,
		fetcher: fetcher,
	}
}

func (s *Service) GetScoreboard(ctx context.Context, date string) ([]Game, error) {

	cached, err := s.cache.GetScoreboard(ctx, date)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching games from upstream")
			fetched, err := s.fetcher.FetchScoreboard(ctx, date)
			if err != nil {
				return nil, err
			}
			if err := s.cache.SetScoreboard(ctx, date, fetched); err != nil {
				log.Printf("failed to set scoreboard in cache: %v", err)
			}

			return fetched, nil
		}
		return nil, err
	}
	log.Println("cache hit, returning cached games")
	return cached, nil
}

func (s *Service) GetGame(ctx context.Context, id string) (Game, error) {
	cached, err := s.cache.GetGame(ctx, id)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching game from upstream")
			fetched, err := s.fetcher.FetchGame(ctx, id)
			if err != nil {
				return Game{}, err
			}
			if err := s.cache.SetGame(ctx, fetched); err != nil {
				log.Printf("failed to set game in cache: %v", err)
			}
			return fetched, nil
		}
		return Game{}, err
	}

	// Cache may hold a thinner or partially mapped game shape from an earlier write.
	// For game detail route, backfill when boxscore is missing or looks incomplete.
	if needsDetailBackfill(cached) {
		log.Println("cache hit without boxscore, fetching full game detail from upstream")
		fetched, err := s.fetcher.FetchGame(ctx, id)
		if err != nil {
			// Serve stale cached game rather than failing the request.
			log.Printf("failed to backfill game detail from upstream: %v", err)
			log.Println("returning cached game")
			return cached, nil
		}
		if err := s.cache.SetGame(ctx, fetched); err != nil {
			log.Printf("failed to set backfilled game in cache: %v", err)
		}
		return fetched, nil
	}

	log.Println("cache hit, returning cached game")
	return cached, nil
}

func needsDetailBackfill(g Game) bool {
	if g.Boxscore == nil {
		return true
	}
	if len(g.Boxscore.Teams) == 0 {
		return true
	}
	if len(g.Boxscore.Players) == 0 {
		return true
	}
	for _, block := range g.Boxscore.Players {
		if len(block.Rows) > 0 {
			return false
		}
	}
	return true
}
