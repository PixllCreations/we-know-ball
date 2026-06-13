package main

import (
	"context"

	"github.com/PixllCreations/we-know-ball/backend/espn"
	"github.com/PixllCreations/we-know-ball/backend/teams"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	defer rdb.Close()

	c := teams.NewCache(rdb)
	espn := espn.NewClient()

	espn.FetchSchedule(context.Background(), "1")

	ts := teams.NewService(c, espn)

	th := teams.NewTeamHandler(ts)

	r := gin.Default()
	api := r.Group("/api/nba")

	th.SetupRoutes(api)

	r.Run(":8081")

}
