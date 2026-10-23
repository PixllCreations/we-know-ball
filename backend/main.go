package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/PixllCreations/we-know-ball/backend/cache"
	"github.com/PixllCreations/we-know-ball/backend/espn"
	"github.com/PixllCreations/we-know-ball/backend/games"
	"github.com/PixllCreations/we-know-ball/backend/nba"
	"github.com/PixllCreations/we-know-ball/backend/push"
	"github.com/PixllCreations/we-know-ball/backend/teams"
	"github.com/PixllCreations/we-know-ball/backend/web"
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
	if os.Getenv("PUSH_ENABLED") == "1" {
		ps, err := push.New(rdb, espnClient, push.Config{
			PublicKey: os.Getenv("VAPID_PUBLIC_KEY"), PrivateKey: os.Getenv("VAPID_PRIVATE_KEY"), Subject: os.Getenv("VAPID_SUBJECT"),
		})
		if err != nil {
			log.Fatal(err)
		}
		ps.Routes(api)
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		go ps.Run(ctx)
	}

	web.Register(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	r.Run(":" + port)

}
