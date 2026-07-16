//go:build embed

package web

import (
	"embed"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path"
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

	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.Status(http.StatusNotFound)
			return
		}

		name := strings.TrimPrefix(c.Request.URL.Path, "/")
		if name == "" || strings.HasSuffix(name, "/") {
			name = "index.html"
		}

		if serveStaticFile(c, static, name) {
			return
		}

		// SPA client-route fallback.
		_ = serveStaticFile(c, static, "index.html")
	})
}

// serveStaticFile writes an embedded file directly.
// Do not use gin's FileFromFS / http.FileServer — they issue relative
// Location: ./ redirects that loop behind Cloudflare/TLS proxies.
func serveStaticFile(c *gin.Context, static fs.FS, name string) bool {
	f, err := static.Open(name)
	if err != nil {
		return false
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil || info.IsDir() {
		return false
	}

	ctype := mime.TypeByExtension(path.Ext(name))
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	c.Header("Content-Type", ctype)
	c.Status(http.StatusOK)
	_, _ = io.Copy(c.Writer, f)
	return true
}
