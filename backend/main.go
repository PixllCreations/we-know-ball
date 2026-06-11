package main

import (
	"context"
	"fmt"
	"log"

	"github.com/PixllCreations/we-know-ball/backend/teams"
	"github.com/redis/go-redis/v9"
)

func main() {

	redis := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	defer redis.Close()
	ts := teams.NewService(redis)

	teams, err := ts.GetTeams(context.Background())
	if err != nil {
		log.Fatalf("failed to get teams: %v", err)
	}

	for _, team := range teams {
		fmt.Printf("Team: %s\n", team.Name)
	}

}
