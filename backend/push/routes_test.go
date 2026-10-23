package push

import (
	"bytes"
	"context"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/PixllCreations/we-know-ball/backend/games"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func TestRoutesSeedCurrentStateAndDisable(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer rdb.Close()
	f := &fakeFetcher{game: games.Game{ID: "123", State: "in", Period: 3}}
	s := &Service{rdb: rdb, fetcher: f}
	router := gin.New()
	s.Routes(router.Group("/api/nba"))
	key, _ := ecdh.P256().GenerateKey(rand.Reader)
	sub := webpush.Subscription{Endpoint: "https://fcm.googleapis.com/push/test", Keys: webpush.Keys{
		Auth: base64.RawURLEncoding.EncodeToString(make([]byte, 16)), P256dh: base64.RawURLEncoding.EncodeToString(key.PublicKey().Bytes()),
	}}
	data, _ := json.Marshal(sub)
	call := func(method, token string, body []byte) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/api/nba/push/games/123", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		out := httptest.NewRecorder()
		router.ServeHTTP(out, req)
		return out
	}
	token := strings.Repeat("a", 64)
	if got := call("PUT", token, data).Code; got != 204 {
		t.Fatalf("save: %d", got)
	}
	calls := 0
	s.send = func(context.Context, []byte, *webpush.Subscription) (int, error) { calls++; return 201, nil }
	s.poll(context.Background())
	if calls != 0 {
		t.Fatal("sent historical tipoff on opt-in")
	}
	if got := call("GET", token, nil); got.Code != 200 || !strings.Contains(got.Body.String(), "true") {
		t.Fatalf("get: %s", got.Body.String())
	}
	if got := call("GET", strings.Repeat("b", 64), nil); !strings.Contains(got.Body.String(), "false") {
		t.Fatal("another device can access watch")
	}
	if got := call("DELETE", token, nil).Code; got != 204 {
		t.Fatalf("delete: %d", got)
	}
	if got := call("GET", token, nil); !strings.Contains(got.Body.String(), "false") {
		t.Fatal("delete did not remove watch")
	}
	if got := call("PUT", "invalid", data).Code; got != 400 {
		t.Fatalf("invalid token: %d", got)
	}
	f.game.Completed = true
	if got := call("PUT", token, data).Code; got != 409 {
		t.Fatalf("completed game accepted: %d", got)
	}
}
