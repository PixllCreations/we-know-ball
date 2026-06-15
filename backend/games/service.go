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
	log.Println("cache hit, returning cached game")
	return cached, nil
}
