package main

import (
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient() *redis.Client {
	if url := os.Getenv("REDIS_URL"); url != "" {
		opts, err := redis.ParseURL(url)
		if err != nil {
			panic("invalid REDIS_URL: " + err.Error())
		}
		return redis.NewClient(opts)
	}

	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	// Allow accidental redis://host:port in REDIS_ADDR
	addr = strings.TrimPrefix(addr, "redis://")
	return redis.NewClient(&redis.Options{
		Addr: addr,
	})
}
