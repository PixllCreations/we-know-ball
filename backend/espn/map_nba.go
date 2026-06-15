package espn

import (
	"github.com/PixllCreations/we-know-ball/backend/nba"
	"github.com/PixllCreations/we-know-ball/backend/teams"
)

func mapStandings(r *StandingsResponse) []nba.ConferenceStandings {
	if r == nil {
		return nil
	}
	out := make([]nba.ConferenceStandings, 0, len(r.Children))
	for _, conf := range r.Children {
		out = append(out, mapStandingsConference(conf))
	}
	return out
}

func mapStandingsConference(c StandingsConference) nba.ConferenceStandings {
	entries := make([]nba.StandingsEntry, 0, len(c.Standings.Entries))
	for _, e := range c.Standings.Entries {
		entries = append(entries, mapStandingsEntry(e))
	}
	out := nba.ConferenceStandings{
		Name:         c.Name,
		Abbreviation: c.Abbreviation,
	}
	out.Standings.Entries = entries
	return out
}

func mapStandingsEntry(e StandingsEntry) nba.StandingsEntry {
	return nba.StandingsEntry{
		Team:  mapStandingsTeam(e.Team),
		Stats: mapStandingsStats(e.Stats),
	}
}

func mapStandingsTeam(t StandingsTeamWire) teams.Team {
	logos := mapTeamLogos(t.Logos)
	logo := ""
	if len(logos) > 0 {
		logo = logos[0].Href
	}
	return teams.Team{
		ID:               t.ID,
		Abbreviation:     t.Abbreviation,
		DisplayName:      t.DisplayName,
		ShortDisplayName: t.ShortDisplayName,
		Name:             t.Name,
		Location:         t.Location,
		Logo:             logo,
		Logos:            logos,
	}
}

func mapStandingsStats(stats []StandingsStat) []nba.StandingsStat {
	if len(stats) == 0 {
		return nil
	}
	out := make([]nba.StandingsStat, 0, len(stats))
	for _, s := range stats {
		out = append(out, nba.StandingsStat{
			Name:         s.Name,
			Abbreviation: s.Abbreviation,
			DisplayValue: s.DisplayValue,
			Value:        s.Value,
		})
	}
	return out
}
