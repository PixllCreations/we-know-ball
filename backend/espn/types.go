package espn

// ============================================================================
// Shared primitives
// ============================================================================

// Logo is shared across endpoints — every ESPN payload uses the same
// {href, [width], [height], ...} shape for image links.
type Logo struct {
	Href        string   `json:"href"`
	Width       int      `json:"width,omitempty"`
	Height      int      `json:"height,omitempty"`
	Alt         string   `json:"alt,omitempty"`
	Rel         []string `json:"rel,omitempty"`
	LastUpdated string   `json:"lastUpdated,omitempty"`
}

// ============================================================================
// GET /teams
// ============================================================================

// TeamsResponse is the envelope returned by GET .../nba/teams.
type TeamsResponse struct {
	Sports []Sport `json:"sports"`
}

type Sport struct {
	ID      string   `json:"id"`
	Leagues []League `json:"leagues"`
}

type League struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Abbreviation string      `json:"abbreviation"`
	ShortName    string      `json:"shortName"`
	Teams        []TeamEntry `json:"teams"`
}

type TeamEntry struct {
	Team Team `json:"team"`
}

// Team is the wire shape ESPN emits inside the teams list. It carries
// more fields than any one consumer needs; feature packages pick the
// subset they care about during mapping.
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

// ============================================================================
// GET /teams/:id/roster
// ============================================================================

type RosterResponse struct {
	Season   Season    `json:"season"`
	Athletes []Athlete `json:"athletes"`
}

type Season struct {
	Year        int    `json:"year"`
	DisplayName string `json:"displayName"`
	Type        int    `json:"type"`
	Name        string `json:"name"`
}

type Athlete struct {
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

type Position struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DisplayName  string `json:"displayName"`
	Abbreviation string `json:"abbreviation"`
}

type Experience struct {
	Years int `json:"years"`
}

// ============================================================================
// Shared event/competition building blocks
//
// Used by both /scoreboard and /teams/:id/schedule. ESPN sends the same
// JSON shape for these in both endpoints, so the decoder can target the
// same Go type. The pieces that genuinely differ between the two
// endpoints (score-as-string vs object, record string vs array, logo
// string vs logos[] array) are split into endpoint-specific types
// further down.
// ============================================================================

// eventCore is the shared event envelope in both /scoreboard and
// /teams/:id/schedule responses.
type eventCore struct {
	ID        string `json:"id"`
	Date      string `json:"date"`
	Name      string `json:"name"`
	ShortName string `json:"shortName"`
}

// competitionCore is the shared competition wrapper in both endpoints.
// Only competitors[] differs in wire shape between scoreboard and schedule.
type competitionCore struct {
	ID          string `json:"id"`
	Date        string `json:"date"`
	Attendance  int    `json:"attendance,omitempty"`
	NeutralSite bool   `json:"neutralSite"`
	Venue       *Venue `json:"venue,omitempty"`
	Notes       []Note `json:"notes,omitempty"`
	Status      Status `json:"status"`
}

type Venue struct {
	FullName string       `json:"fullName"`
	Address  VenueAddress `json:"address"`
}

type VenueAddress struct {
	City  string `json:"city,omitempty"`
	State string `json:"state,omitempty"`
}

type Note struct {
	Type     string `json:"type"`
	Headline string `json:"headline"`
}

type Status struct {
	Clock        float64    `json:"clock,omitempty"`
	DisplayClock string     `json:"displayClock,omitempty"`
	Period       int        `json:"period,omitempty"`
	Type         StatusType `json:"type"`
}

type StatusType struct {
	State       string `json:"state"`
	Completed   bool   `json:"completed"`
	Description string `json:"description"`
	Detail      string `json:"detail"`
	ShortDetail string `json:"shortDetail"`
}

type LeaderCategory struct {
	Name         string   `json:"name"`
	DisplayName  string   `json:"displayName"`
	Abbreviation string   `json:"abbreviation"`
	Leaders      []Leader `json:"leaders"`
}

type Leader struct {
	DisplayValue string        `json:"displayValue"`
	Value        float64       `json:"value,omitempty"`
	Athlete      LeaderAthlete `json:"athlete"`
}

// LeaderAthlete is the slim athlete excerpt embedded in leader
// payloads. It's distinct from the roster-endpoint Athlete (which
// carries jersey, height, weight, etc.) because ESPN only populates
// id/displayName/shortName here.
type LeaderAthlete struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	ShortName   string `json:"shortName"`
}

// ============================================================================
// GET /summary?event={id}
//
// Game detail payload: header (scores/status), boxscore (team + player stats),
// gameInfo (venue/attendance), and per-team leaders. Only fields needed for
// mapping are modeled; plays, odds, injuries, etc. are ignored by the decoder.
// ============================================================================

// SummaryResponse is the root document returned by GET .../summary?event={id}.
type SummaryResponse struct {
	Header   SummaryHeader        `json:"header"`
	Boxscore *SummaryBoxscore     `json:"boxscore,omitempty"`
	GameInfo *SummaryGameInfo     `json:"gameInfo,omitempty"`
	Leaders  []SummaryLeaderTeam  `json:"leaders,omitempty"`
}

type SummaryHeader struct {
	ID           string               `json:"id"`
	GameNote     string               `json:"gameNote,omitempty"`
	Competitions []SummaryCompetition `json:"competitions"`
}

type SummaryCompetition struct {
	competitionCore
	Competitors []SummaryCompetitor `json:"competitors"`
}

// SummaryCompetitor mirrors schedule competitors: score is a string and
// team logos arrive as logos[], not team.logo.
type SummaryCompetitor struct {
	ID       string                `json:"id"`
	HomeAway string                `json:"homeAway"`
	Winner   bool                  `json:"winner,omitempty"`
	Team     SummaryCompetitorTeam `json:"team"`
	Score    string                `json:"score"`
	Records  []ScoreboardRecord    `json:"records,omitempty"`
}

type SummaryCompetitorTeam struct {
	ID               string `json:"id"`
	Abbreviation     string `json:"abbreviation"`
	DisplayName      string `json:"displayName"`
	ShortDisplayName string `json:"shortDisplayName,omitempty"`
	Name             string `json:"name,omitempty"`
	Location         string `json:"location,omitempty"`
	Logo             string `json:"logo,omitempty"`
	Logos            []Logo `json:"logos,omitempty"`
}

type SummaryGameInfo struct {
	Venue      *Venue `json:"venue,omitempty"`
	Attendance int    `json:"attendance,omitempty"`
}

type SummaryLeaderTeam struct {
	Team    Team             `json:"team"`
	Leaders []LeaderCategory `json:"leaders"`
}

type SummaryBoxscore struct {
	Teams   []SummaryBoxscoreTeam    `json:"teams,omitempty"`
	Players []SummaryBoxscorePlayers `json:"players,omitempty"`
}

type SummaryBoxscoreTeam struct {
	Team         Team               `json:"team"`
	Statistics   []SummaryStatistic `json:"statistics"`
	DisplayOrder int                `json:"displayOrder,omitempty"`
	HomeAway     string             `json:"homeAway,omitempty"`
}

type SummaryStatistic struct {
	Name         string `json:"name"`
	DisplayValue string `json:"displayValue"`
	Label        string `json:"label"`
	Abbreviation string `json:"abbreviation,omitempty"`
}

type SummaryBoxscorePlayers struct {
	Team         Team                      `json:"team"`
	Statistics   []SummaryPlayerStatistics `json:"statistics"`
	DisplayOrder int                       `json:"displayOrder,omitempty"`
}

// SummaryPlayerStatistics holds the player stat table for one team.
// athletes[].stats values align by index with names[] (parallel arrays).
type SummaryPlayerStatistics struct {
	Names        []string                     `json:"names"`
	Keys         []string                     `json:"keys,omitempty"`
	Labels       []string                     `json:"labels,omitempty"`
	Descriptions []string                     `json:"descriptions,omitempty"`
	Athletes     []SummaryBoxscoreAthleteLine `json:"athletes"`
	Totals       []string                     `json:"totals,omitempty"`
}

type SummaryBoxscoreAthleteLine struct {
	Active     bool                   `json:"active,omitempty"`
	Starter    bool                   `json:"starter,omitempty"`
	DidNotPlay bool                   `json:"didNotPlay,omitempty"`
	Reason     string                 `json:"reason,omitempty"`
	Ejected    bool                   `json:"ejected,omitempty"`
	Athlete    SummaryBoxscoreAthlete `json:"athlete"`
	Stats      []string               `json:"stats"`
}

type SummaryBoxscoreAthlete struct {
	ID          string   `json:"id"`
	DisplayName string   `json:"displayName"`
	ShortName   string   `json:"shortName"`
	Jersey      string   `json:"jersey,omitempty"`
	Position    Position `json:"position,omitempty"`
	Headshot    *Logo    `json:"headshot,omitempty"`
}

// ============================================================================
// GET /scoreboard
//
// Shape differences vs the schedule endpoint (same field names, different
// JSON types). Each is handled by a dedicated wire type here:
//
//	competitors[].score       — string "108"        (schedule: object)
//	competitors[].record      — string "1-3"        (schedule: array)
//	competitors[].records     — array of objects    (no equivalent on schedule)
//	competitors[].team.logo   — single URL string   (schedule: logos[] array)
// ============================================================================

type ScoreboardResponse struct {
	Events []ScoreboardEvent `json:"events"`
}

type ScoreboardEvent struct {
	eventCore
	Competitions []ScoreboardCompetition `json:"competitions"`
}

type ScoreboardCompetition struct {
	competitionCore
	Competitors []ScoreboardCompetitor `json:"competitors"`
}

type ScoreboardCompetitor struct {
	ID       string                   `json:"id"`
	HomeAway string                   `json:"homeAway"`
	Winner   bool                     `json:"winner,omitempty"`
	Team     ScoreboardCompetitorTeam `json:"team"`
	Score    string                   `json:"score"`
	Record   string                   `json:"record,omitempty"`
	Records  []ScoreboardRecord       `json:"records,omitempty"`
	Leaders  []LeaderCategory         `json:"leaders,omitempty"`
}

type ScoreboardCompetitorTeam struct {
	ID           string `json:"id"`
	Abbreviation string `json:"abbreviation"`
	DisplayName  string `json:"displayName"`
	Logo         string `json:"logo,omitempty"`
}

type ScoreboardRecord struct {
	Name         string `json:"name"`
	Abbreviation string `json:"abbreviation"`
	Type         string `json:"type"`
	Summary      string `json:"summary"`
}

// ============================================================================
// GET /teams/:id/schedule
//
// Fields the schedule payload includes that we don't model (links[],
// season, seasonType, etc.) are simply ignored by the decoder.
// competitors[].leaders is only populated on the queried team's
// competitor.
// ============================================================================

type ScheduleResponse struct {
	Events []ScheduleEvent `json:"events"`
}

type ScheduleEvent struct {
	eventCore
	Competitions []ScheduleCompetition `json:"competitions"`
}

type ScheduleCompetition struct {
	competitionCore
	Competitors []ScheduleCompetitor `json:"competitors"`
}

type ScheduleCompetitor struct {
	ID       string                 `json:"id"`
	HomeAway string                 `json:"homeAway"`
	Winner   bool                   `json:"winner,omitempty"`
	Team     ScheduleCompetitorTeam `json:"team"`
	Score    ScheduleScore          `json:"score"`
	Record   []ScheduleRecord       `json:"record,omitempty"`
	Leaders  []LeaderCategory       `json:"leaders,omitempty"`
}

type ScheduleCompetitorTeam struct {
	ID           string `json:"id"`
	Abbreviation string `json:"abbreviation"`
	DisplayName  string `json:"displayName"`
	Logos        []Logo `json:"logos,omitempty"`
}

type ScheduleScore struct {
	DisplayValue string  `json:"displayValue"`
	Value        float64 `json:"value,omitempty"`
}

type ScheduleRecord struct {
	Type         string `json:"type"`
	DisplayValue string `json:"displayValue"`
}

// ============================================================================
// GET /standings (core v2)
// ============================================================================

type StandingsResponse struct {
	Abbreviation string                `json:"abbreviation"`
	Children     []StandingsConference `json:"children"`
}

type StandingsConference struct {
	Abbreviation string         `json:"abbreviation"`
	ID           string         `json:"id"`
	IsConference bool           `json:"isConference"`
	Name         string         `json:"name"`
	Standings    StandingsTable `json:"standings"`
}

type StandingsTable struct {
	DisplayName string           `json:"displayName"`
	Entries     []StandingsEntry `json:"entries"`
	ID          string           `json:"id"`
	Name        string           `json:"name"`
}

type StandingsEntry struct {
	Stats []StandingsStat     `json:"stats"`
	Team  StandingsTeamWire   `json:"team"`
}

type StandingsStat struct {
	Name             string  `json:"name"`
	Abbreviation     string  `json:"abbreviation,omitempty"`
	Description      string  `json:"description,omitempty"`
	DisplayName      string  `json:"displayName,omitempty"`
	DisplayValue     string  `json:"displayValue"`
	ShortDisplayName string  `json:"shortDisplayName,omitempty"`
	Type             string  `json:"type,omitempty"`
	Value            float64 `json:"value,omitempty"`
	Summary          string  `json:"summary,omitempty"`
}

type StandingsTeamWire struct {
	ID               string `json:"id"`
	Abbreviation     string `json:"abbreviation"`
	DisplayName      string `json:"displayName"`
	ShortDisplayName string `json:"shortDisplayName"`
	Name             string `json:"name,omitempty"`
	Location         string `json:"location,omitempty"`
	Logos            []Logo `json:"logos,omitempty"`
}
