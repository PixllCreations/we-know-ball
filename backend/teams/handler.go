package teams

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

func (h *Handler) GetTeam(c *gin.Context) {

	id := c.Param("id")
	team, err := h.service.GetTeam(
		c.Request.Context(),
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, team)
}

func (h *Handler) GetTeams(c *gin.Context) {

	teams, err := h.service.GetTeams(
		c.Request.Context(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, teams)
}

func (h *Handler) GetRoster(c *gin.Context) {
	id := c.Param("id")
	roster, err := h.service.GetRoster(
		c.Request.Context(),
		id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, roster)
}

func (h *Handler) GetSchedule(c *gin.Context) {
	id := c.Param("id")
	schedule, err := h.service.GetSchedule(c.Request.Context(), id)
	if err != nil {
		log.Printf("schedule fetch failed for team %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, schedule)
}

func (h *Handler) SetupRoutes(r *gin.RouterGroup) {
	r.GET("/teams/:id", h.GetTeam)
	r.GET("/teams", h.GetTeams)
	r.GET("/teams/:id/roster", h.GetRoster)
	r.GET("/teams/:id/schedule", h.GetSchedule)
}
