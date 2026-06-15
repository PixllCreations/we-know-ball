package nba

import (
	"context"
	"errors"
	"log"

	"github.com/PixllCreations/we-know-ball/backend/cache"
)

type Service struct {
	nbaCache *NbaCache
	fetcher  Fetcher
}

func NewService(nbaCache *NbaCache, fetcher Fetcher) *Service {
	return &Service{
		nbaCache: nbaCache,
		fetcher:  fetcher,
	}
}

/*
==========================

	Standings API

==========================
*/

func (ts *Service) GetStandings(ctx context.Context) ([]ConferenceStandings, error) {
	cached, err := ts.nbaCache.GetStandings(ctx)
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			log.Println("cache miss, fetching standings from upstream")
			fetched, err := ts.fetcher.FetchStandings(ctx)
			if err != nil {
				return nil, err
			}
			if err := ts.nbaCache.SetStandings(ctx, fetched); err != nil {
				log.Printf("failed to set standings in cache: %v", err)
			}
			return fetched, nil
		}
		return nil, err
	}
	log.Println("cache hit, returning cached standings")
	return cached, nil
}
