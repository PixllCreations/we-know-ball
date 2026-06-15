package cache

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

var ErrCacheMiss = errors.New("cache miss")

const emptySetMarker = "__empty__"

type Cache struct {
	redis *redis.Client
}

func New(redis *redis.Client) *Cache {
	return &Cache{
		redis: redis,
	}
}

func (c *Cache) Get(
	ctx context.Context,
	key string,
	dst any,
) error {
	val, err := c.redis.Get(ctx, key).Result()

	if errors.Is(err, redis.Nil) {
		return ErrCacheMiss
	}

	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(val), dst)
}

func (c *Cache) Set(
	ctx context.Context,
	key string,
	value any,
	ttl time.Duration,
) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return c.redis.Set(
		ctx,
		key,
		data,
		ttl,
	).Err()
}

func (c *Cache) Delete(
	ctx context.Context,
	key string,
) error {
	return c.redis.Del(ctx, key).Err()
}

func (c *Cache) MGetRaw(
	ctx context.Context,
	keys []string,
) ([]interface{}, error) {
	return c.redis.MGet(ctx, keys...).Result()
}

func (c *Cache) AddToSet(
	ctx context.Context,
	key string,
	members ...string,
) error {

	args := make([]any, len(members))

	for i, member := range members {
		args[i] = member
	}

	return c.redis.SAdd(
		ctx,
		key,
		args...,
	).Err()
}
func (c *Cache) GetSetMembers(
	ctx context.Context,
	key string,
) ([]string, error) {

	exists, err := c.redis.Exists(
		ctx,
		key,
	).Result()

	if err != nil {
		return nil, err
	}

	if exists == 0 {
		return nil, ErrCacheMiss
	}

	members, err := c.redis.SMembers(
		ctx,
		key,
	).Result()

	if err != nil {
		return nil, err
	}

	if len(members) == 1 &&
		members[0] == emptySetMarker {

		return []string{}, nil
	}

	filtered := make([]string, 0, len(members))

	for _, member := range members {
		if member != emptySetMarker {
			filtered = append(filtered, member)
		}
	}

	return filtered, nil
}

func (c *Cache) RemoveFromSet(
	ctx context.Context,
	key string,
	members ...string,
) error {

	args := make([]any, len(members))

	for i, member := range members {
		args[i] = member
	}

	return c.redis.SRem(
		ctx,
		key,
		args...,
	).Err()
}

func (c *Cache) SetExpiry(
	ctx context.Context,
	key string,
	ttl time.Duration,
) error {
	return c.redis.Expire(
		ctx,
		key,
		ttl,
	).Err()
}
