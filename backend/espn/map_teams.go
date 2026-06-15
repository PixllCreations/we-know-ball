package espn

import (
	"github.com/PixllCreations/we-know-ball/backend/games"
	"github.com/PixllCreations/we-know-ball/backend/teams"
)

func mapTeams(wire []Team) []teams.Team {
	out := make([]teams.Team, 0, len(wire))
	for _, t := range wire {
		out = append(out, mapTeam(t))
	}
	return out
}

func mapTeam(t Team) teams.Team {
	logos := mapTeamLogos(t.Logos)
	logo := t.Logo
	if logo == "" && len(logos) > 0 {
		logo = logos[0].Href
	}
	return teams.Team{
		ID:               t.ID,
		Abbreviation:     t.Abbreviation,
		DisplayName:      t.DisplayName,
		ShortDisplayName: t.ShortDisplayName,
		Name:             t.Name,
		Location:         t.Location,
		Color:            t.Color,
		AlternateColor:   t.AlternateColor,
		Logo:             logo,
		Logos:            logos,
		Record:           t.Record,
	}
}

func mapTeamLogos(wire []Logo) []teams.Logo {
	if len(wire) == 0 {
		return nil
	}
	out := make([]teams.Logo, 0, len(wire))
	for _, l := range wire {
		out = append(out, teams.Logo{Href: l.Href})
	}
	return out
}

func mapPlayers(wire []Athlete) []teams.Player {
	out := make([]teams.Player, 0, len(wire))
	for _, a := range wire {
		out = append(out, mapPlayer(a))
	}
	return out
}

func mapPlayer(a Athlete) teams.Player {
	var headshot *teams.Logo
	if a.Headshot != nil {
		headshot = &teams.Logo{Href: a.Headshot.Href}
	}
	return teams.Player{
		ID:            a.ID,
		FullName:      a.FullName,
		DisplayName:   a.DisplayName,
		Jersey:        a.Jersey,
		Position:      teams.Position(a.Position),
		Height:        a.Height,
		DisplayHeight: a.DisplayHeight,
		Weight:        a.Weight,
		DisplayWeight: a.DisplayWeight,
		Age:           a.Age,
		Experience:    teams.Experience(a.Experience),
		Headshot:      headshot,
	}
}

func mapSchedule(r *ScheduleResponse) []games.Game {
	if r == nil {
		return nil
	}
	out := make([]games.Game, 0, len(r.Events))
	for _, e := range r.Events {
		out = append(out, mapScheduleEvent(e))
	}
	return out
}

func mapScheduleEvent(e ScheduleEvent) games.Game {
	g := games.Game{
		ID:        e.ID,
		Date:      e.Date,
		Name:      e.Name,
		ShortName: e.ShortName,
	}
	if len(e.Competitions) == 0 {
		return g
	}

	comp := e.Competitions[0]
	g.Attendance = comp.Attendance
	g.NeutralSite = comp.NeutralSite
	g.Venue = mapGameVenue(comp.Venue)
	applyCompetitionStatus(&g, comp.Status)

	if len(comp.Notes) > 0 {
		g.Headline = comp.Notes[0].Headline
	}
	g.Notes = mapGameNotes(comp.Notes)

	for _, c := range comp.Competitors {
		assignParticipant(&g, c.HomeAway, mapScheduleParticipant(c))
		if len(g.Leaders) == 0 && len(c.Leaders) > 0 {
			g.Leaders = mapGameLeaders(c.Leaders)
		}
	}

	return g
}
