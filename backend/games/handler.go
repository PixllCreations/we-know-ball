package games

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{
		service: s,
	}
}

func (h *Handler) GetScoreboard(c *gin.Context) {
	dates := c.Query("dates")
	games, err := h.service.GetScoreboard(c.Request.Context(), dates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, games)
}

func (h *Handler) GetSummary(c *gin.Context) {
	gameID := c.Param("id")
	summary, err := h.service.GetGame(c.Request.Context(), gameID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *Handler) SetupRoutes(r *gin.RouterGroup) {
	r.GET("/scoreboard", h.GetScoreboard)
	r.GET("/games/:id", h.GetSummary)
}
