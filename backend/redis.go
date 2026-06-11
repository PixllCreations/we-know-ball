package main

import "github.com/redis/go-redis/v9"

func NewClient() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
}
