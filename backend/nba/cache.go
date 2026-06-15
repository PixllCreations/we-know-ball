package nba

import (
	"context"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/cache"
)

type NbaCache struct {
	cache *cache.Cache
	key   string
	ttl   time.Duration
}

func NewCache(c *cache.Cache) *NbaCache {
	return &NbaCache{
		cache: c,
		key:   "standings",
		ttl:   24 * time.Hour,
	}
}

func (nc *NbaCache) GetStandings(ctx context.Context) ([]ConferenceStandings, error) {
	var standings []ConferenceStandings
	if err := nc.cache.Get(ctx, nc.key, &standings); err != nil {
		return nil, err
	}
	return standings, nil
}

func (nc *NbaCache) SetStandings(ctx context.Context, standings []ConferenceStandings) error {
	return nc.cache.Set(ctx, nc.key, standings, nc.ttl)
}
