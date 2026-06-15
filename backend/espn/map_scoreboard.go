package espn

import "github.com/PixllCreations/we-know-ball/backend/games"

func mapScoreboard(r *ScoreboardResponse) []games.Game {
	if r == nil {
		return nil
	}
	out := make([]games.Game, 0, len(r.Events))
	for _, e := range r.Events {
		out = append(out, mapScoreboardEvent(e))
	}
	return out
}

func mapScoreboardEvent(e ScoreboardEvent) games.Game {
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
		assignParticipant(&g, c.HomeAway, mapScoreboardParticipant(c))
		if len(g.Leaders) == 0 && len(c.Leaders) > 0 {
			g.Leaders = mapGameLeaders(c.Leaders)
		}
	}

	return g
}
