// Package push delivers opt-in, per-device game alerts independently of page visits.
package push

import (
	"context"
	"crypto/ecdh"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PixllCreations/we-know-ball/backend/games"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	watchTTL     = 7 * 24 * time.Hour
	watchVersion = 2
)

var digits = regexp.MustCompile(`^[0-9]{1,20}$`)
var tokenPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

type Config struct{ PublicKey, PrivateKey, Subject string }
type Service struct {
	rdb     *redis.Client
	fetcher games.Fetcher
	config  Config
	send    func(context.Context, []byte, *webpush.Subscription) (int, error)
}
type watch struct {
	GameID       string               `json:"gameId"`
	Subscription webpush.Subscription `json:"subscription"`
	Version      int                  `json:"version,omitempty"`
	Phase        int                  `json:"phase"`
	Period       int                  `json:"period,omitempty"`
}

func librarySubscriber(subject string) string {
	return strings.TrimPrefix(subject, "mailto:")
}

func New(rdb *redis.Client, fetcher games.Fetcher, cfg Config) (*Service, error) {
	pub, e1 := base64.RawURLEncoding.DecodeString(cfg.PublicKey)
	priv, e2 := base64.RawURLEncoding.DecodeString(cfg.PrivateKey)
	key, e3 := ecdh.P256().NewPrivateKey(priv)
	if e1 != nil || e2 != nil || e3 != nil || key == nil || !strings.HasPrefix(cfg.Subject, "mailto:") && !strings.HasPrefix(cfg.Subject, "https://") {
		return nil, fmt.Errorf("invalid push keys or subject")
	}
	if hex.EncodeToString(key.PublicKey().Bytes()) != hex.EncodeToString(pub) {
		return nil, fmt.Errorf("push keys do not match")
	}
	s := &Service{rdb: rdb, fetcher: fetcher, config: cfg}
	// webpush-go v1.4 adds mailto: to every subscriber that is not an HTTPS
	// URL. Strip our configuration's standards-compliant prefix so it does not
	// produce an invalid mailto:mailto:... JWT subject.
	subscriber := librarySubscriber(cfg.Subject)
	client := &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	s.send = func(ctx context.Context, data []byte, sub *webpush.Subscription) (int, error) {
		resp, err := webpush.SendNotificationWithContext(ctx, data, sub, &webpush.Options{
			Subscriber: subscriber, VAPIDPublicKey: cfg.PublicKey, VAPIDPrivateKey: cfg.PrivateKey,
			TTL: 300, HTTPClient: client,
		})
		if err != nil {
			return 0, err
		}
		defer resp.Body.Close()
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		return resp.StatusCode, nil
	}
	return s, nil
}

// Phase increases monotonically. Unknown, cancelled and postponed states do not
// count as finals; halftime requires ESPN's explicit status, not a stopped clock.
func phase(g games.Game) int {
	if g.Completed {
		return 4
	}
	if g.State == "pre" {
		return 0
	}
	if g.State != "in" {
		return -1
	}
	if g.StatusCode == "STATUS_HALFTIME" || strings.EqualFold(g.Status, "Halftime") {
		return 2
	}
	if g.Period >= 3 {
		return 3
	}
	return 1
}
func event(w watch, g games.Game) string {
	p := phase(g)
	if p < 0 {
		return ""
	}
	if p == 4 && w.Phase < 4 {
		return "Final score"
	}
	if g.State != "in" {
		return ""
	}
	if p == 2 && w.Phase < 2 {
		return "Halftime"
	}
	if g.Period == 1 && w.Phase == 0 {
		return "Tipoff"
	}
	if g.Period > w.Period {
		switch g.Period {
		case 2:
			return "Second quarter"
		case 3:
			return "Third quarter"
		case 4:
			return "Fourth quarter"
		}
	}
	return ""
}

func validSubscription(sub webpush.Subscription) bool {
	u, err := url.Parse(sub.Endpoint)
	if err != nil || u.Scheme != "https" || u.User != nil || u.Port() != "" || u.Fragment != "" || len(sub.Endpoint) > 2048 {
		return false
	}
	// Restrict outbound delivery to browser push services (prevent arbitrary URL requests).
	host := u.Hostname()
	if host != "fcm.googleapis.com" && host != "updates.push.services.mozilla.com" && host != "web.push.apple.com" && !strings.HasSuffix(host, ".push.apple.com") {
		return false
	}
	auth, err := base64.RawURLEncoding.DecodeString(sub.Keys.Auth)
	if err != nil || len(auth) != 16 {
		return false
	}
	pub, err := base64.RawURLEncoding.DecodeString(sub.Keys.P256dh)
	if err != nil {
		return false
	}
	_, err = ecdh.P256().NewPublicKey(pub)
	return err == nil
}

func providerHost(sub webpush.Subscription) string {
	u, err := url.Parse(sub.Endpoint)
	if err != nil {
		return "unknown"
	}
	return u.Hostname()
}

func safeDeliveryError(err error, sub webpush.Subscription) string {
	if err == nil {
		return ""
	}
	// Push endpoints are bearer-like capability URLs. Never write one to logs.
	if sub.Endpoint == "" {
		return err.Error()
	}
	return strings.ReplaceAll(err.Error(), sub.Endpoint, "[push endpoint]")
}

func (s *Service) Routes(api *gin.RouterGroup) {
	api.GET("/push/config", func(c *gin.Context) { c.JSON(200, gin.H{"publicKey": s.config.PublicKey}) })
	group := api.Group("/push/games/:id", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if !digits.MatchString(c.Param("id")) || !tokenPattern.MatchString(token) {
			c.AbortWithStatus(400)
			return
		}
		hash := sha256.Sum256([]byte(token))
		c.Set("watchKey", "push:watch:"+c.Param("id")+":"+hex.EncodeToString(hash[:]))
		// Bound public endpoint writes and expensive upstream reads per client IP.
		ipHash := sha256.Sum256([]byte(c.ClientIP()))
		limitKey := "push:rate:" + hex.EncodeToString(ipHash[:]) + ":" + time.Now().UTC().Format("200601021504")
		n, err := s.rdb.Incr(c.Request.Context(), limitKey).Result()
		if err != nil {
			c.AbortWithStatus(503)
			return
		}
		if n == 1 {
			s.rdb.Expire(c.Request.Context(), limitKey, 2*time.Minute)
		}
		if n > 60 {
			c.AbortWithStatus(429)
			return
		}
		c.Next()
	})
	group.GET("", func(c *gin.Context) {
		exists, err := s.rdb.Exists(c.Request.Context(), c.GetString("watchKey")).Result()
		if err != nil {
			c.Status(503)
			return
		}
		c.JSON(200, gin.H{"enabled": exists > 0})
	})
	group.PUT("", func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
		var sub webpush.Subscription
		if c.ShouldBindJSON(&sub) != nil || !validSubscription(sub) {
			c.Status(400)
			return
		}
		g, err := s.fetcher.FetchGame(c.Request.Context(), c.Param("id"))
		if err != nil || g.ID != c.Param("id") {
			c.Status(502)
			return
		}
		if g.Completed || phase(g) < 0 {
			c.JSON(409, gin.H{"error": "This game is not available for alerts."})
			return
		}
		data, _ := json.Marshal(watch{GameID: g.ID, Subscription: sub, Version: watchVersion, Phase: phase(g), Period: g.Period})
		if s.rdb.Set(c.Request.Context(), c.GetString("watchKey"), data, watchTTL).Err() != nil {
			c.Status(503)
			return
		}
		c.Status(204)
	})
	group.DELETE("", func(c *gin.Context) {
		if s.rdb.Del(c.Request.Context(), c.GetString("watchKey")).Err() != nil {
			c.Status(503)
			return
		}
		c.Status(204)
	})
	group.POST("/test", func(c *gin.Context) {
		raw, err := s.rdb.Get(c.Request.Context(), c.GetString("watchKey")).Result()
		if errors.Is(err, redis.Nil) {
			c.Status(404)
			return
		}
		if err != nil {
			c.Status(503)
			return
		}
		var w watch
		if json.Unmarshal([]byte(raw), &w) != nil || !validSubscription(w.Subscription) {
			c.Status(500)
			return
		}
		payload, _ := json.Marshal(map[string]string{
			"title": "We Know Ball test alert",
			"body":  "Game alerts are working on this device.",
			"url":   "/games/" + w.GameID,
			"tag":   "game-" + w.GameID + "-test",
		})
		sendCtx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
		status, sendErr := s.send(sendCtx, payload, &w.Subscription)
		cancel()
		provider := providerHost(w.Subscription)
		if sendErr != nil {
			log.Printf("push: test delivery failed game=%s provider=%s error=%s", w.GameID, provider, safeDeliveryError(sendErr, w.Subscription))
			c.Status(502)
			return
		}
		if status == 401 || status == 403 || status == 404 || status == 410 {
			_ = s.rdb.Del(c.Request.Context(), c.GetString("watchKey")).Err()
			log.Printf("push: test subscription invalid game=%s provider=%s status=%d", w.GameID, provider, status)
			c.Status(410)
			return
		}
		if status < 200 || status >= 300 {
			log.Printf("push: test delivery rejected game=%s provider=%s status=%d", w.GameID, provider, status)
			c.Status(502)
			return
		}
		log.Printf("push: test delivery accepted game=%s provider=%s status=%d", w.GameID, provider, status)
		c.Status(204)
	})
}

func (s *Service) Run(ctx context.Context) {
	s.poll(ctx)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.poll(ctx)
		}
	}
}
func (s *Service) poll(ctx context.Context) {
	// Reuse each fresh game snapshot for all devices watching it during this poll.
	snapshots := map[string]games.Game{}
	var cursor uint64
	for {
		keys, next, err := s.rdb.Scan(ctx, cursor, "push:watch:*", 100).Result()
		if err != nil {
			log.Print("push: could not scan watches")
			return
		}
		for _, key := range keys {
			if strings.HasSuffix(key, ":lease") {
				continue
			}
			if ctx.Err() != nil {
				return
			}
			s.process(ctx, key, snapshots)
		}
		cursor = next
		if cursor == 0 {
			return
		}
	}
}

// Compare-and-set prevents a poll from resurrecting a disabled or changed watch.
var updateWatch = redis.NewScript(`if redis.call('GET', KEYS[1]) == ARGV[1] then
 if ARGV[2] == '' then return redis.call('DEL', KEYS[1]) end
 return redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL') end return 0`)

func (s *Service) process(ctx context.Context, key string, snapshots map[string]games.Game) {
	// The short lease avoids concurrent sends from multiple API instances. It expires
	// naturally rather than deleting a lease potentially acquired by another worker.
	ok, err := s.rdb.SetNX(ctx, key+":lease", "1", 25*time.Second).Result()
	if err != nil || !ok {
		return
	}
	raw, err := s.rdb.Get(ctx, key).Result()
	if err != nil {
		return
	}
	var w watch
	if json.Unmarshal([]byte(raw), &w) != nil {
		return
	}
	g, ok := snapshots[w.GameID]
	if !ok {
		var err error
		g, err = s.fetcher.FetchGame(ctx, w.GameID)
		if err != nil || g.ID != w.GameID {
			log.Print("push: game refresh failed")
			return
		}
		snapshots[w.GameID] = g
	}
	p := phase(g)
	if p < 0 {
		return
	}
	// Watches from the previous schema did not record the last observed period.
	// Seed them from the current live snapshot without inventing a quarter alert.
	// A pending final remains safe to deliver because the legacy phase records it.
	if w.Version < watchVersion && !g.Completed {
		w.Version = watchVersion
		w.Phase = p
		w.Period = g.Period
		data, _ := json.Marshal(w)
		if _, err := updateWatch.Run(ctx, s.rdb, []string{key}, raw, string(data)).Result(); err != nil {
			log.Print("push: could not migrate delivery state")
		}
		return
	}
	advanced := p > w.Phase || g.Period > w.Period
	if !advanced {
		return
	}
	title := event(w, g)
	remove := false
	if title != "" {
		payload, _ := json.Marshal(map[string]string{
			"title": title + " · " + g.ShortName,
			"body":  fmt.Sprintf("%s %s — %s %s", g.Away.DisplayName, g.Away.Score, g.Home.DisplayName, g.Home.Score),
			"url":   "/games/" + g.ID,
			"tag":   fmt.Sprintf("game-%s-%d-%d", g.ID, p, g.Period),
		})
		sendCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		status, err := s.send(sendCtx, payload, &w.Subscription)
		cancel()
		provider := providerHost(w.Subscription)
		if err != nil {
			log.Printf("push: delivery failed game=%s event=%q provider=%s error=%s; will retry", g.ID, title, provider, safeDeliveryError(err, w.Subscription))
			return
		}
		if status == 401 || status == 403 || status == 404 || status == 410 {
			log.Printf("push: subscription invalid game=%s event=%q provider=%s status=%d", g.ID, title, provider, status)
			remove = true
		} else if status < 200 || status >= 300 {
			log.Printf("push: delivery rejected game=%s event=%q provider=%s status=%d; will retry", g.ID, title, provider, status)
			return
		} else {
			log.Printf("push: delivery accepted game=%s event=%q provider=%s status=%d", g.ID, title, provider, status)
		}
	}
	w.Version = watchVersion
	w.Phase = p
	w.Period = g.Period
	data, _ := json.Marshal(w)
	if remove || g.Completed {
		data = nil
	}
	if _, err := updateWatch.Run(ctx, s.rdb, []string{key}, raw, string(data)).Result(); err != nil {
		log.Print("push: could not save delivery state")
	}
}
