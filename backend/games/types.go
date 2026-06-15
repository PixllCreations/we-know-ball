package games

import "context"

type Game struct {
	ID        string `json:"id"`
	Date      string `json:"date"`
	Name      string `json:"name"`
	ShortName string `json:"shortName"`

	State        string  `json:"state"`
	Status       string  `json:"status"`
	ShortDetail  string  `json:"shortDetail,omitempty"`
	Detail       string  `json:"detail,omitempty"`
	Completed    bool    `json:"completed"`
	Clock        float64 `json:"clock,omitempty"`
	DisplayClock string  `json:"displayClock,omitempty"`
	Period       int     `json:"period,omitempty"`

	Headline    string `json:"headline,omitempty"`
	Venue       *Venue `json:"venue,omitempty"`
	Attendance  int    `json:"attendance,omitempty"`
	NeutralSite bool   `json:"neutralSite,omitempty"`

	Home    Participant `json:"home"`
	Away    Participant `json:"away"`
	Leaders []Leader    `json:"leaders,omitempty"`
	Notes   []Note      `json:"notes,omitempty"`
}

type Venue struct {
	FullName string `json:"fullName"`
	City     string `json:"city,omitempty"`
	State    string `json:"state,omitempty"`
}

type Note struct {
	Type     string `json:"type"`
	Headline string `json:"headline"`
}

type Participant struct {
	ID           string   `json:"id"`
	Abbreviation string   `json:"abbreviation"`
	DisplayName  string   `json:"displayName"`
	Logo         string   `json:"logo,omitempty"`
	Logos        []Logo   `json:"logos,omitempty"`
	Score        string   `json:"score,omitempty"`
	Winner       bool     `json:"winner,omitempty"`
	Records      []Record `json:"records,omitempty"`
}

type Logo struct {
	Href string `json:"href"`
}

type Record struct {
	Type         string `json:"type"`
	DisplayValue string `json:"displayValue"`
}

type Leader struct {
	Category     string `json:"category"`
	DisplayName  string `json:"displayName"`
	Abbreviation string `json:"abbreviation,omitempty"`
	Value        string `json:"value"`
	AthleteID    string `json:"athleteId,omitempty"`
	Athlete      string `json:"athlete"`
}

type Fetcher interface {
	FetchScoreboard(ctx context.Context, date string) ([]Game, error)
	FetchGame(ctx context.Context, id string) (Game, error)
}
