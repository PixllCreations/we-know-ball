package espn

import (
	"strconv"

	"github.com/PixllCreations/we-know-ball/backend/games"
)

func mapGameVenue(v *Venue) *games.Venue {
	if v == nil || v.FullName == "" {
		return nil
	}
	return &games.Venue{
		FullName: v.FullName,
		City:     v.Address.City,
		State:    v.Address.State,
	}
}

func applyCompetitionStatus(g *games.Game, s Status) {
	g.State = s.Type.State
	g.Status = s.Type.Description
	g.ShortDetail = s.Type.ShortDetail
	g.Detail = s.Type.Detail
	g.Completed = s.Type.Completed
	g.Clock = s.Clock
	g.DisplayClock = s.DisplayClock
	g.Period = s.Period
}

func mapGameNotes(ns []Note) []games.Note {
	if len(ns) == 0 {
		return nil
	}
	out := make([]games.Note, 0, len(ns))
	for _, n := range ns {
		out = append(out, games.Note{Type: n.Type, Headline: n.Headline})
	}
	return out
}

func mapGameLeaders(cats []LeaderCategory) []games.Leader {
	if len(cats) == 0 {
		return nil
	}
	out := make([]games.Leader, 0, len(cats))
	for _, cat := range cats {
		if len(cat.Leaders) == 0 {
			continue
		}
		l := cat.Leaders[0]
		out = append(out, games.Leader{
			Category:     cat.Name,
			DisplayName:  cat.DisplayName,
			Abbreviation: cat.Abbreviation,
			Value:        l.DisplayValue,
			AthleteID:    l.Athlete.ID,
			Athlete:      l.Athlete.DisplayName,
		})
	}
	return out
}

func mapScoreboardRecords(rs []ScoreboardRecord) []games.Record {
	if len(rs) == 0 {
		return nil
	}
	out := make([]games.Record, 0, len(rs))
	for _, r := range rs {
		out = append(out, games.Record{
			Type:         r.Type,
			DisplayValue: r.Summary,
		})
	}
	return out
}

func mapScheduleRecords(rs []ScheduleRecord) []games.Record {
	if len(rs) == 0 {
		return nil
	}
	out := make([]games.Record, 0, len(rs))
	for _, r := range rs {
		out = append(out, games.Record{
			Type:         r.Type,
			DisplayValue: r.DisplayValue,
		})
	}
	return out
}

func mapScoreboardParticipant(c ScoreboardCompetitor) games.Participant {
	var logos []games.Logo
	if c.Team.Logo != "" {
		logos = []games.Logo{{Href: c.Team.Logo}}
	}
	return games.Participant{
		ID:           c.Team.ID,
		Abbreviation: c.Team.Abbreviation,
		DisplayName:  c.Team.DisplayName,
		Logo:         c.Team.Logo,
		Logos:        logos,
		Score:        c.Score,
		Winner:       c.Winner,
		Records:      mapScoreboardRecords(c.Records),
	}
}

func mapScheduleParticipant(c ScheduleCompetitor) games.Participant {
	logo := ""
	var logos []games.Logo
	if len(c.Team.Logos) > 0 {
		logo = c.Team.Logos[0].Href
		logos = make([]games.Logo, 0, len(c.Team.Logos))
		for _, l := range c.Team.Logos {
			logos = append(logos, games.Logo{Href: l.Href})
		}
	}
	score := c.Score.DisplayValue
	if score == "" && c.Score.Value != 0 {
		score = strconv.FormatFloat(c.Score.Value, 'f', -1, 64)
	}
	return games.Participant{
		ID:           c.Team.ID,
		Abbreviation: c.Team.Abbreviation,
		DisplayName:  c.Team.DisplayName,
		Logo:         logo,
		Logos:        logos,
		Score:        score,
		Winner:       c.Winner,
		Records:      mapScheduleRecords(c.Record),
	}
}

func assignParticipant(g *games.Game, homeAway string, p games.Participant) {
	switch homeAway {
	case "home":
		g.Home = p
	case "away":
		g.Away = p
	}
}
