package teams

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrCacheMiss    = errors.New("cache miss")
	ErrUnmarshal    = errors.New("unmarshal error")
	ErrTeamNotFound = errors.New("team not found")
)

type TeamCache struct {
	key   string
	redis *redis.Client
	ttl   time.Duration
}

func NewCache(redis *redis.Client) *TeamCache {
	return &TeamCache{
		redis: redis,
		key:   "teams",
		ttl:   24 * time.Hour,
	}
}

func (tc *TeamCache) load(ctx context.Context) ([]TeamRef, error) {
	val, err := tc.redis.Get(ctx, tc.key).Result()

	if errors.Is(err, redis.Nil) {
		return nil, ErrCacheMiss
	}

	teams, err := parseTeams(val)
	if err != nil {
		return nil, err
	}

	return teams, nil
}

func (tc *TeamCache) save(ctx context.Context, teams []TeamRef) error {
	encoded, err := encodeTeams(teams)
	if err != nil {
		return err
	}

	return tc.redis.Set(ctx, tc.key, encoded, tc.ttl).Err()
}

func (tc *TeamCache) GetTeam(ctx context.Context, id string) (TeamRef, error) {
	teams, err := tc.load(ctx)

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

func (tc *TeamCache) SetTeams(ctx context.Context, teams []TeamRef) error {
	return tc.save(ctx, teams)
}

func (tc *TeamCache) GetTeams(ctx context.Context) ([]TeamRef, error) {
	return tc.load(ctx)
}

func parseTeams(data string) ([]TeamRef, error) {
	var teams []TeamRef

	if err := json.Unmarshal([]byte(data), &teams); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnmarshal, err)
	}

	return teams, nil
}

func encodeTeams(teams []TeamRef) ([]byte, error) {
	return json.Marshal(teams)
}
