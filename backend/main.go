package main

import (
	"github.com/PixllCreations/we-know-ball/backend/cache"
	"github.com/PixllCreations/we-know-ball/backend/espn"
	"github.com/PixllCreations/we-know-ball/backend/games"
	"github.com/PixllCreations/we-know-ball/backend/nba"
	"github.com/PixllCreations/we-know-ball/backend/teams"
	"github.com/gin-gonic/gin"
)

func main() {
	rdb := NewRedisClient()
	defer rdb.Close()

	cache := cache.New(rdb)
	tc := teams.NewCache(cache)
	gc := games.NewCache(cache)
	nc := nba.NewCache(cache)

	espnClient := espn.NewClient()

	ts := teams.NewService(tc, gc, espnClient)
	gs := games.NewService(gc, espnClient)
	ns := nba.NewService(nc, espnClient)

	th := teams.NewHandler(ts)
	gh := games.NewHandler(gs)
	nh := nba.NewHandler(ns)

	r := gin.Default()
	api := r.Group("/api/nba")

	th.SetupRoutes(api)
	gh.SetupRoutes(api)
	nh.SetupRoutes(api)

	r.Run(":8081")

}
