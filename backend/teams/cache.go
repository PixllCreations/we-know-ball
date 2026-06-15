package teams

import (
	"context"
	"errors"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/cache"
)

var (
	ErrTeamNotFound = errors.New("team not found")
)

type TeamCache struct {
	cache *cache.Cache
	key   string
	ttl   time.Duration
}

func NewCache(c *cache.Cache) *TeamCache {
	return &TeamCache{
		cache: c,
		key:   "teams",
		ttl:   24 * time.Hour,
	}
}

func (tc *TeamCache) GetTeams(
	ctx context.Context,
) ([]Team, error) {
	var teams []Team

	if err := tc.cache.Get(
		ctx,
		tc.key,
		&teams,
	); err != nil {
		return nil, err
	}

	return teams, nil
}

func (tc *TeamCache) SetTeams(
	ctx context.Context,
	teams []Team,
) error {
	return tc.cache.Set(
		ctx,
		tc.key,
		teams,
		tc.ttl,
	)
}

func (tc *TeamCache) GetTeam(
	ctx context.Context,
	id string,
) (Team, error) {
	teams, err := tc.GetTeams(ctx)
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

func (tc *TeamCache) GetRoster(ctx context.Context, teamID string) ([]Player, error) {
	var roster []Player

	if err := tc.cache.Get(ctx, "roster:"+teamID, &roster); err != nil {
		return nil, err
	}

	return roster, nil
}

func (tc *TeamCache) SetRoster(ctx context.Context, teamID string, roster []Player) error {
	return tc.cache.Set(ctx, "roster:"+teamID, roster, tc.ttl)
}
