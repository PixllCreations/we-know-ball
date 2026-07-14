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

	staticHTTP := http.FS(static)

	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}

		path := strings.TrimPrefix(c.Request.URL.Path, "/")
		if path == "" || strings.HasSuffix(path, "/") {
			path = "index.html"
		}

		if f, err := static.Open(path); err == nil {
			defer f.Close()
			if info, err := f.Stat(); err == nil && !info.IsDir() {
				c.FileFromFS(path, staticHTTP)
				return
			}
		}

		// SPA fallback — serve index.html without using http.FileServer,
		// which issues trailing-slash redirects that loop behind TLS-terminating proxies.
		c.FileFromFS("index.html", staticHTTP)
	})
}
