package nba

import (
	"context"

	"github.com/PixllCreations/we-know-ball/backend/teams"
)

type ConferenceStandings struct {
	Name         string `json:"name"`
	Abbreviation string `json:"abbreviation"`
	Standings    struct {
		Entries []StandingsEntry `json:"entries"`
	} `json:"standings"`
}

type StandingsEntry struct {
	Team  teams.Team      `json:"team"`
	Stats []StandingsStat `json:"stats"`
}

type StandingsStat struct {
	Name         string  `json:"name"`
	Abbreviation string  `json:"abbreviation,omitempty"`
	DisplayValue string  `json:"displayValue"`
	Value        float64 `json:"value,omitempty"`
}

type Fetcher interface {
	FetchStandings(ctx context.Context) ([]ConferenceStandings, error)
}
