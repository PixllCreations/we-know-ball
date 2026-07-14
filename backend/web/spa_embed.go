//go:build embed

package web

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed dist/*
var dist embed.FS

func Register(r *gin.Engine) {
	static, err := fs.Sub(dist, "dist")
	if err != nil {
		panic(err)
	}

	fileServer := http.FileServer(http.FS(static))

	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}

		path := strings.TrimPrefix(c.Request.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		if _, err := static.Open(path); err != nil {
			path = "index.html"
		}

		c.Request.URL.Path = "/" + path
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}
