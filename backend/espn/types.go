package espn

import (
	"github.com/PixllCreations/we-know-ball/backend/teams"
)

type teamsResponse struct {
	Sports []sport `json:"sports"`
}

type sport struct {
	ID      string   `json:"id"`
	Leagues []league `json:"leagues"`
}

type league struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Abbreviation string      `json:"abbreviation"`
	ShortName    string      `json:"shortName"`
	Teams        []teamEntry `json:"teams"`
}

type teamEntry struct {
	Team teams.TeamRef `json:"team"`
}

type teamSeason struct {
	Year        int    `json:"year"`
	DisplayName string `json:"displayName"`
	Type        int    `json:"type"`
	Name        string `json:"name"`
}

type rosterResponse struct {
	Season   teamSeason        `json:"season"`
	Athletes []teams.PlayerRef `json:"athletes"`
}

type scheduleResponse struct {
	Team   teams.TeamRef   `json:"team"`
	Events []teams.GameRef `json:"events"`
	Season scheduleSeason  `json:"season"`
}

type scheduleSeason struct {
	Year        int    `json:"year"`
	Type        int    `json:"type"`
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
}
