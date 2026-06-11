package teams

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

const ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams"

type Logo struct {
	Href string `json:"href"`
}

type Reference struct {
	Ref string `json:"$ref"`
}

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
	Team TeamRef `json:"team"`
}
