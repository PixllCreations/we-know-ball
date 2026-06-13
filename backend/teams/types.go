package teams

import (
	"context"
)

type TeamRef struct {
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

type PlayerRef struct {
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

type GameRef struct {
	ID           string            `json:"id"`
	Date         string            `json:"date"`
	Name         string            `json:"name"`
	ShortName    string            `json:"shortName"`
	Competitions []GameCompetition `json:"competitions"`
}

type GameCompetition struct {
	ID          string           `json:"id"`
	Date        string           `json:"date"`
	Attendance  int              `json:"attendance,omitempty"`
	NeutralSite bool             `json:"neutralSite"`
	Venue       *GameVenue       `json:"venue,omitempty"`
	Competitors []GameCompetitor `json:"competitors"`
	Notes       []GameNote       `json:"notes,omitempty"`
	Status      GameStatus       `json:"status"`
}

type GameVenue struct {
	FullName string           `json:"fullName"`
	Address  GameVenueAddress `json:"address"`
}

type GameVenueAddress struct {
	City  string `json:"city,omitempty"`
	State string `json:"state,omitempty"`
}

type GameCompetitor struct {
	ID       string               `json:"id"`
	HomeAway string               `json:"homeAway"`
	Winner   bool                 `json:"winner,omitempty"`
	Team     GameCompetitorTeam   `json:"team"`
	Score    GameScore            `json:"score"`
	Record   []GameRecord         `json:"record,omitempty"`
	Leaders  []GameLeaderCategory `json:"leaders,omitempty"`
}

type GameCompetitorTeam struct {
	ID           string `json:"id"`
	Abbreviation string `json:"abbreviation"`
	DisplayName  string `json:"displayName"`
	Logos        []Logo `json:"logos,omitempty"`
}

type GameScore struct {
	DisplayValue string  `json:"displayValue"`
	Value        float64 `json:"value,omitempty"`
}

type GameRecord struct {
	Type         string `json:"type"`
	DisplayValue string `json:"displayValue"`
}

type GameNote struct {
	Type     string `json:"type"`
	Headline string `json:"headline"`
}

type GameStatus struct {
	Clock        float64        `json:"clock,omitempty"`
	DisplayClock string         `json:"displayClock,omitempty"`
	Period       int            `json:"period,omitempty"`
	Type         GameStatusType `json:"type"`
}

type GameStatusType struct {
	State       string `json:"state"`
	Completed   bool   `json:"completed"`
	Description string `json:"description"`
	Detail      string `json:"detail"`
	ShortDetail string `json:"shortDetail"`
}

type GameLeaderCategory struct {
	Name         string       `json:"name"`
	DisplayName  string       `json:"displayName"`
	Abbreviation string       `json:"abbreviation"`
	Leaders      []GameLeader `json:"leaders"`
}

type GameLeader struct {
	DisplayValue string            `json:"displayValue"`
	Value        float64           `json:"value,omitempty"`
	Athlete      GameLeaderAthlete `json:"athlete"`
}

type GameLeaderAthlete struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName"`
}

type Fetcher interface {
	FetchTeams(ctx context.Context) ([]TeamRef, error)
	FetchRoster(ctx context.Context, teamID string) ([]PlayerRef, error)
	FetchSchedule(ctx context.Context, teamID string) ([]GameRef, error)
}
