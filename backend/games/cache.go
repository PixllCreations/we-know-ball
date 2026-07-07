package games

import (
	"context"
	"encoding/json"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/cache"
)

type GameCache struct {
	cache *cache.Cache
	ttl   time.Duration
}

func NewCache(c *cache.Cache) *GameCache {
	return &GameCache{
		cache: c,
		ttl:   24 * time.Hour,
	}
}

func gameKey(id string) string {
	return "game:" + id
}

func teamGamesKey(teamID string) string {
	return "team-games:" + teamID
}

func scoreboardKey(date string) string {
	return "scoreboard:" + date
}

func (gc *GameCache) SetGame(
	ctx context.Context,
	game Game,
) error {
	// Preserve richer cached game detail when ingesting thinner scoreboard/schedule shapes.
	if cached, err := gc.GetGame(ctx, game.ID); err == nil {
		if game.Boxscore == nil && cached.Boxscore != nil {
			game.Boxscore = cached.Boxscore
		}
	} else if err != cache.ErrCacheMiss {
		return err
	}

	return gc.cache.Set(
		ctx,
		gameKey(game.ID),
		game,
		gc.ttl,
	)
}

func (gc *GameCache) SetGames(
	ctx context.Context,
	games []Game,
) error {

	for _, game := range games {
		if err := gc.SetGame(
			ctx,
			game,
		); err != nil {
			return err
		}
	}

	return nil
}

func (gc *GameCache) GetGame(
	ctx context.Context,
	id string,
) (Game, error) {

	var game Game

	if err := gc.cache.Get(
		ctx,
		gameKey(id),
		&game,
	); err != nil {
		return Game{}, err
	}

	return game, nil
}

func (gc *GameCache) GetGames(
	ctx context.Context,
	ids []string,
) ([]Game, error) {

	if len(ids) == 0 {
		return []Game{}, nil
	}

	keys := make([]string, 0, len(ids))

	for _, id := range ids {
		keys = append(keys, gameKey(id))
	}

	values, err := gc.cache.MGetRaw(
		ctx,
		keys,
	)
	if err != nil {
		return nil, err
	}

	games := make([]Game, 0, len(values))

	for _, value := range values {
		if value == nil {
			return nil, cache.ErrCacheMiss
		}

		str, ok := value.(string)
		if !ok {
			return nil, cache.ErrCacheMiss
		}

		var game Game
		if err := json.Unmarshal(
			[]byte(str),
			&game,
		); err != nil {
			return nil, err
		}

		games = append(games, game)
	}

	return games, nil
}

func (gc *GameCache) SetTeamGameIDs(
	ctx context.Context,
	teamID string,
	gameIDs []string,
) error {

	key := teamGamesKey(teamID)

	if err := gc.cache.Delete(
		ctx,
		teamGamesKey(teamID),
	); err != nil {
		return err
	}

	if err := gc.cache.AddToSet(
		ctx,
		key,
		gameIDs...,
	); err != nil {
		return err
	}

	return gc.cache.SetExpiry(
		ctx,
		key,
		gc.ttl,
	)
}

func (gc *GameCache) GetTeamGameIDs(
	ctx context.Context,
	teamID string,
) ([]string, error) {

	return gc.cache.GetSetMembers(
		ctx,
		teamGamesKey(teamID),
	)
}

func (gc *GameCache) SetTeamGames(
	ctx context.Context,
	teamID string,
	games []Game,
) error {

	if err := gc.SetGames(
		ctx,
		games,
	); err != nil {
		return err
	}

	ids := make([]string, 0, len(games))

	for _, game := range games {
		ids = append(ids, game.ID)
	}

	return gc.SetTeamGameIDs(
		ctx,
		teamID,
		ids,
	)
}

func (gc *GameCache) GetTeamGames(
	ctx context.Context,
	teamID string,
) ([]Game, error) {

	ids, err := gc.GetTeamGameIDs(
		ctx,
		teamID,
	)
	if err != nil {
		return nil, err
	}

	return gc.GetGames(
		ctx,
		ids,
	)
}

func (gc *GameCache) SetScoreboardGameIDs(
	ctx context.Context,
	date string,
	gameIDs []string,
) error {
	key := scoreboardKey(date)

	if err := gc.cache.Delete(ctx, key); err != nil {
		return err
	}

	return gc.cache.Set(
		ctx,
		key,
		gameIDs,
		gc.ttl,
	)
}

func (gc *GameCache) GetScoreboardGameIDs(
	ctx context.Context,
	date string,
) ([]string, error) {

	var ids []string

	if err := gc.cache.Get(
		ctx,
		scoreboardKey(date),
		&ids,
	); err != nil {
		return nil, err
	}

	return ids, nil
}

func (gc *GameCache) SetScoreboard(
	ctx context.Context,
	date string,
	games []Game,
) error {

	if err := gc.SetGames(
		ctx,
		games,
	); err != nil {
		return err
	}

	ids := make([]string, 0, len(games))

	for _, game := range games {
		ids = append(ids, game.ID)
	}

	return gc.SetScoreboardGameIDs(
		ctx,
		date,
		ids,
	)
}

func (gc *GameCache) GetScoreboard(
	ctx context.Context,
	date string,
) ([]Game, error) {

	ids, err := gc.GetScoreboardGameIDs(
		ctx,
		date,
	)
	if err != nil {
		return nil, err
	}

	return gc.GetGames(
		ctx,
		ids,
	)
}
