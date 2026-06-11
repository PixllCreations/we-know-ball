# We Know Ball 🏀

**Because everyone thinks they know ball.**

We Know Ball is a real-time NBA analytics and data platform built with an Odin backend and modern web technologies.

The platform aggregates live NBA data, standings, player statistics, team information, and advanced analytics into a single experience designed for fans who want more than a basic scoreboard.

Rather than replicating ESPN, We Know Ball focuses on delivering faster updates, deeper insights, and tools that help users explore, compare, and analyze the league.

---

## Vision

Most sports websites answer:

> "What happened?"

We Know Ball aims to answer:

> "Why did it happen?"
>
> "What happens next?"
>
> "Who actually knows ball?"

The long-term goal is to evolve from a live NBA dashboard into a complete basketball analytics and simulation platform.

---

## Features

### Live Games

- Real-time scores
- Live game tracking
- Play-by-play updates
- Game summaries
- Team statistics

### Teams

- Team profiles
- Rosters
- Standings
- Schedule tracking
- Team performance analytics

### Players

- Player profiles
- Season statistics
- Career comparisons
- Advanced metrics
- Performance trends

### Analytics

- Team rankings
- Player comparisons
- Efficiency metrics
- Historical trends
- Custom power rankings

### Hot Takes

Because everyone thinks they know ball.

- MVP predictions
- Championship predictions
- Trade grades
- Award forecasting
- Power ranking debates
- Weekly community picks
- Accuracy tracking for predictions

### Future Features

- Trade machine
- Salary cap explorer
- Draft simulator
- Season simulator
- Playoff simulator
- Fantasy basketball tools

---

## Architecture

```text
                    ESPN APIs
                         │
                         ▼
               Odin Data Service
        (Ingestion, Caching, Analytics)
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
      REST API                    WebSocket Hub
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
                  Next.js Frontend
```

---

## Technology Stack

### Backend

- Odin
- Native HTTP server
- WebSockets
- In-memory caching
- Background workers

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Real-time WebSocket subscriptions

### Data Sources

- ESPN Public APIs

---

## Core Principles

### Real-Time First

Clients should receive updates instantly without polling.

### Data Ownership

External data is normalized and cached internally so clients never depend directly on third-party APIs.

### Fast User Experience

The backend acts as a high-performance data layer that serves clients from memory whenever possible.

### Analytics Over News

Focus on statistics, insights, comparisons, and simulations rather than articles and journalism.

---

## API Examples

### Games

```http
GET /api/games/live
GET /api/games/today
GET /api/games/:id
```

### Teams

```http
GET /api/teams
GET /api/teams/:id
GET /api/teams/:id/roster
GET /api/teams/:id/stats
```

### Players

```http
GET /api/players/:id
GET /api/players/:id/stats
```

### Standings

```http
GET /api/standings
```

---

## WebSocket Events

### Game Updated

```json
{
  "event": "game.updated",
  "gameId": "401705871"
}
```

### Team Updated

```json
{
  "event": "team.updated",
  "teamId": "14"
}
```

### Standings Updated

```json
{
  "event": "standings.updated"
}
```

---

## Roadmap

### Phase 1 — Foundation

- [ ] HTTP server
- [ ] ESPN integration
- [ ] JSON parsing
- [ ] In-memory cache
- [ ] Core API endpoints

### Phase 2 — Real-Time Infrastructure

- [ ] WebSocket server
- [ ] Event broadcasting
- [ ] Live score updates
- [ ] Subscription system

### Phase 3 — NBA Dashboard

- [ ] Live games page
- [ ] Standings page
- [ ] Team pages
- [ ] Player pages

### Phase 4 — Analytics

- [ ] Team comparisons
- [ ] Advanced statistics
- [ ] Power rankings
- [ ] Historical trends

### Phase 5 — Simulations

- [ ] Season simulator
- [ ] Playoff simulator
- [ ] Lottery simulator
- [ ] Trade machine

### Phase 6 — We Really Know Ball

- [ ] Prediction engine
- [ ] Award forecasting
- [ ] Team-building tools
- [ ] Franchise management features
- [ ] Did We Know Ball? prediction scoring

---

## Why Odin?

We Know Ball uses Odin as a high-performance data platform rather than a traditional web framework.

The backend is responsible for:

- Data ingestion
- Data normalization
- Caching
- Event streaming
- Analytics
- Simulations

This allows the project to explore Odin's strengths in systems programming, performance, and data-oriented design while using modern web technologies for the user experience.

---

## Disclaimer

We Know Ball is an independent project and is not affiliated with, endorsed by, or associated with the NBA, ESPN, or any NBA team.

---

## License

MIT
