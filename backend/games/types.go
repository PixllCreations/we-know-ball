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

	Boxscore *Boxscore `json:"boxscore,omitempty"`
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

type Boxscore struct {
	Teams   []BoxscoreTeam    `json:"teams,omitempty"`
	Players []BoxscorePlayers `json:"players,omitempty"`
}

// BoxscoreTeam holds aggregate, team-level stats (FG, REB, AST, etc.).
type BoxscoreTeam struct {
	Team       ParticipantTeam     `json:"team"`
	HomeAway   string              `json:"homeAway,omitempty"`
	Stats      []BoxscoreTeamStat   `json:"stats,omitempty"`
	DisplayOrd int                 `json:"displayOrder,omitempty"`
}

type BoxscoreTeamStat struct {
	Name         string `json:"name"`
	Label        string `json:"label"`
	Abbreviation string `json:"abbreviation,omitempty"`
	DisplayValue string `json:"displayValue"`
}

// BoxscorePlayers holds one team table in the player box score.
// Values are parallel arrays aligned by index with Columns.
type BoxscorePlayers struct {
	Team       ParticipantTeam        `json:"team"`
	Columns    []string             `json:"columns"`
	Rows       []BoxscorePlayerLine `json:"rows"`
	TotalsRow  []string             `json:"totalsRow,omitempty"`
	DisplayOrd int                  `json:"displayOrder,omitempty"`
}

type BoxscorePlayerLine struct {
	Player    BoxscorePlayer `json:"player"`
	Values    []string       `json:"values"`
	Starter   bool           `json:"starter,omitempty"`
	DidNotPlay bool          `json:"didNotPlay,omitempty"`
	Reason    string         `json:"reason,omitempty"`
	Ejected   bool           `json:"ejected,omitempty"`
}

type BoxscorePlayer struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName,omitempty"`
	Jersey      string `json:"jersey,omitempty"`
	Position    string `json:"position,omitempty"`
	Headshot    string `json:"headshot,omitempty"`
}

// ParticipantTeam is the subset of team fields reused across boxscore + game shell.
type ParticipantTeam struct {
	ID           string `json:"id"`
	Abbreviation string `json:"abbreviation"`
	DisplayName  string `json:"displayName"`
	Logo         string `json:"logo,omitempty"`
	Logos        []Logo `json:"logos,omitempty"`
}

type Fetcher interface {
	FetchScoreboard(ctx context.Context, date string) ([]Game, error)
	FetchGame(ctx context.Context, id string) (Game, error)
}
