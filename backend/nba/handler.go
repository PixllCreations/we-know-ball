package nba

import (
	"log"
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

func (h *Handler) GetStandings(c *gin.Context) {
	standings, err := h.service.GetStandings(c.Request.Context())
	if err != nil {
		log.Printf("standings fetch failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, standings)
}

func (h *Handler) SetupRoutes(r *gin.RouterGroup) {
	r.GET("/standings", h.GetStandings)
}
