package teams

import (
	"context"

	"github.com/PixllCreations/we-know-ball/backend/games"
)

type Team struct {
	ID               string `json:"id"`
	Abbreviation     string `json:"abbreviation"`
	DisplayName      string `json:"displayName"`
	ShortDisplayName string `json:"shortDisplayName"`
	Name             string `json:"name,omitempty"`
	Location         string `json:"location,omitempty"`
	Color            string `json:"color,omitempty"`
	AlternateColor   string `json:"alternateColor,omitempty"`
	Logo             string `json:"logo,omitempty"`
	Logos            []Logo `json:"logos,omitempty"`
	Record           string `json:"record,omitempty"`
}

type Logo struct {
	Href string `json:"href"`
}

type Position struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DisplayName  string `json:"displayName"`
	Abbreviation string `json:"abbreviation"`
}

type Experience struct {
	Years int `json:"years"`
}

type Player struct {
	ID            string     `json:"id"`
	FullName      string     `json:"fullName"`
	DisplayName   string     `json:"displayName"`
	Jersey        string     `json:"jersey,omitempty"`
	Position      Position   `json:"position,omitempty"`
	Height        float32    `json:"height,omitempty"`
	DisplayHeight string     `json:"displayHeight,omitempty"`
	Weight        float32    `json:"weight,omitempty"`
	DisplayWeight string     `json:"displayWeight,omitempty"`
	Age           int        `json:"age,omitempty"`
	Experience    Experience `json:"experience,omitempty"`
	Headshot      *Logo      `json:"headshot,omitempty"`
}

type Fetcher interface {
	FetchTeams(ctx context.Context) ([]Team, error)
	FetchRoster(ctx context.Context, teamID string) ([]Player, error)
	FetchSchedule(ctx context.Context, teamID string) ([]games.Game, error)
}
