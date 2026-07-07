package espn

import (
	"strings"

	"github.com/PixllCreations/we-know-ball/backend/games"
)

func mapSummary(r *SummaryResponse) games.Game {
	if r == nil {
		return games.Game{}
	}

	g := games.Game{
		ID:       r.Header.ID,
		Headline: r.Header.GameNote,
	}

	if len(r.Header.Competitions) == 0 {
		return g
	}

	comp := r.Header.Competitions[0]
	g.Date = comp.Date
	g.Attendance = comp.Attendance
	g.NeutralSite = comp.NeutralSite
	g.Venue = mapGameVenue(comp.Venue)
	applyCompetitionStatus(&g, comp.Status)
	g.Notes = mapGameNotes(comp.Notes)
	if g.Headline == "" && len(comp.Notes) > 0 {
		g.Headline = comp.Notes[0].Headline
	}

	for _, c := range comp.Competitors {
		assignParticipant(&g, c.HomeAway, mapSummaryParticipant(c))
	}

	if g.Away.DisplayName != "" && g.Home.DisplayName != "" {
		g.Name = g.Away.DisplayName + " at " + g.Home.DisplayName
	}
	if g.Away.Abbreviation != "" && g.Home.Abbreviation != "" {
		g.ShortName = g.Away.Abbreviation + " @ " + g.Home.Abbreviation
	}

	// GameInfo can provide venue/attendance even if competition omits them.
	if r.GameInfo != nil {
		if g.Venue == nil && r.GameInfo.Venue != nil {
			g.Venue = mapGameVenue(r.GameInfo.Venue)
		}
		if g.Attendance == 0 {
			g.Attendance = r.GameInfo.Attendance
		}
	}

	for _, lt := range r.Leaders {
		if len(lt.Leaders) > 0 {
			g.Leaders = mapGameLeaders(lt.Leaders)
			break
		}
	}

	if r.Boxscore != nil {
		g.Boxscore = &games.Boxscore{
			Teams:   mapBoxscoreTeams(r.Boxscore.Teams),
			Players: mapBoxscorePlayers(r.Boxscore.Players),
		}
	}

	return g
}

func mapSummaryParticipant(c SummaryCompetitor) games.Participant {
	logo := c.Team.Logo
	if logo == "" && len(c.Team.Logos) > 0 {
		logo = c.Team.Logos[0].Href
	}

	logos := make([]games.Logo, 0, len(c.Team.Logos))
	for _, l := range c.Team.Logos {
		logos = append(logos, games.Logo{Href: l.Href})
	}

	return games.Participant{
		ID:           c.Team.ID,
		Abbreviation: c.Team.Abbreviation,
		DisplayName:  c.Team.DisplayName,
		Logo:         logo,
		Logos:        logos,
		Score:        c.Score,
		Winner:       c.Winner,
		Records:      mapScoreboardRecords(c.Records),
	}
}

func mapBoxscoreTeams(in []SummaryBoxscoreTeam) []games.BoxscoreTeam {
	if len(in) == 0 {
		return nil
	}
	out := make([]games.BoxscoreTeam, 0, len(in))
	for _, t := range in {
		stats := make([]games.BoxscoreTeamStat, 0, len(t.Statistics))
		for _, s := range t.Statistics {
			stats = append(stats, games.BoxscoreTeamStat{
				Name:         s.Name,
				Label:        s.Label,
				Abbreviation: s.Abbreviation,
				DisplayValue: s.DisplayValue,
			})
		}
		out = append(out, games.BoxscoreTeam{
			Team: games.ParticipantTeam{
				ID:           t.Team.ID,
				Abbreviation: t.Team.Abbreviation,
				DisplayName:  t.Team.DisplayName,
				Logo:         t.Team.Logo,
				Logos:        mapLogos(t.Team.Logos),
			},
			HomeAway:   t.HomeAway,
			Stats:      stats,
			DisplayOrd: t.DisplayOrder,
		})
	}
	return out
}

func mapBoxscorePlayers(in []SummaryBoxscorePlayers) []games.BoxscorePlayers {
	if len(in) == 0 {
		return nil
	}
	out := make([]games.BoxscorePlayers, 0, len(in))
	for _, teamBlock := range in {
		if len(teamBlock.Statistics) == 0 {
			continue
		}
		table := teamBlock.Statistics[0]
		lines := make([]games.BoxscorePlayerLine, 0, len(table.Athletes))
		for _, a := range table.Athletes {
			lines = append(lines, games.BoxscorePlayerLine{
				Player: games.BoxscorePlayer{
					ID:          a.Athlete.ID,
					DisplayName: a.Athlete.DisplayName,
					ShortName:   a.Athlete.ShortName,
					Jersey:      a.Athlete.Jersey,
					Position:    a.Athlete.Position.Abbreviation,
					Headshot:    headshotHref(a.Athlete.Headshot),
				},
				Values:     a.Stats,
				Starter:    a.Starter,
				DidNotPlay: a.DidNotPlay,
				Reason:     a.Reason,
				Ejected:    a.Ejected,
			})
		}
		out = append(out, games.BoxscorePlayers{
			Team: games.ParticipantTeam{
				ID:           teamBlock.Team.ID,
				Abbreviation: teamBlock.Team.Abbreviation,
				DisplayName:  teamBlock.Team.DisplayName,
				Logo:         teamBlock.Team.Logo,
				Logos:        mapLogos(teamBlock.Team.Logos),
			},
			Columns:    tableColumns(table),
			Rows:       lines,
			TotalsRow:  table.Totals,
			DisplayOrd: teamBlock.DisplayOrder,
		})
	}
	return out
}

func mapLogos(in []Logo) []games.Logo {
	if len(in) == 0 {
		return nil
	}
	out := make([]games.Logo, 0, len(in))
	for _, l := range in {
		out = append(out, games.Logo{Href: l.Href})
	}
	return out
}

func headshotHref(logo *Logo) string {
	if logo == nil {
		return ""
	}
	return logo.Href
}

func trimStrings(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	out := make([]string, 0, len(in))
	for _, s := range in {
		out = append(out, strings.TrimSpace(s))
	}
	return out
}

func tableColumns(table SummaryPlayerStatistics) []string {
	if cols := trimStrings(table.Labels); len(cols) > 0 {
		return cols
	}
	return trimStrings(table.Names)
}
