# We Know Ball

Full-stack NBA data platform with a Go API, Redis caching layer, and dual React + Angular frontends.

Live scores, standings, team pages, rosters, schedules, and game box scores — built as a focused alternative to bloated sports media sites.

---

## Highlights

- **API-first backend** — Go service that ingests ESPN public NBA APIs, maps verbose upstream JSON into stable domain models, and exposes 7 REST endpoints under `/api/nba`
- **Redis caching layer** — Cache-aside pattern with entity-level keys, batch `MGET` retrieval, and merge logic that preserves richer cached game detail when thinner scoreboard payloads arrive
- **Modular domain architecture** — Backend split into `games`, `teams`, and `nba` packages with separate handlers, services, caches, and ESPN mappers
- **React dashboard** — Scoreboard with date navigation and 30s polling, standings, team directory/detail, and interactive team/player box scores (TanStack Query, shadcn/ui)
- **Angular port** — Standalone Angular 21 client with feature parity, validating the API contract across frameworks

---

## What I Built

### Backend

Designed a Go HTTP API that sits between third-party sports data and the UI. ESPN responses are large, inconsistent, and not suitable for direct client consumption — so the backend owns ingestion, normalization, and caching.

- Fetches from ESPN Site v2 (teams, scoreboard, rosters, schedules, summaries) and Core v2 (standings)
- Maps upstream wire types into flat, UI-friendly structs via a dedicated `espn/` translation layer
- Caches results in Redis with a 24-hour TTL and cache-aside reads in each service layer
- Uses Gin for routing and a typed `Fetcher` interface to keep domain logic decoupled from ESPN

### Frontend (React)

Built the primary UI as a React + TypeScript SPA with a typed API client (`nba-api.ts`) that keeps response shapes stable for components.

- Route-level pages for scoreboard, standings, teams, team detail, and game detail
- TanStack Query for server state, stale-time tuning, and scoreboard auto-refresh
- Tailwind CSS + shadcn/ui component primitives for a consistent design system

### Frontend (Angular)

Reimplemented the same product surface in Angular 21 to exercise the API contract independently of React.

- Standalone components, signals, `rxResource`, and `HttpClient`-based API service
- Shared design tokens and feature parity with the React app

---

## Architecture

```text
              ESPN Public APIs
                      │
                      ▼
            Go API (Gin, :8081)
     Ingestion · Mapping · Redis Cache
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
  React Frontend            Angular Frontend
  (Vite, :8080)             (:4200)
         │                         │
         └────────────┬────────────┘
                      │
              REST via /api/nba
```

Both frontends are independent clients over the same API. The Vite dev server proxies `/api` to the Go backend.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Backend** | Go 1.25, Gin, go-redis, ESPN Site/Core v2 APIs |
| **Frontend (React)** | React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind, shadcn/ui, Vitest |
| **Frontend (Angular)** | Angular 21, RxJS, `rxResource`, Tailwind |
| **Infrastructure** | Redis (local), REST |

---

## Features

- **Scoreboard** — Daily games with date navigation; live, upcoming, and final states; auto-refresh
- **Standings** — Conference standings with records and stats
- **Teams** — Directory, detail pages, rosters, and schedules
- **Games** — Matchup detail with team and player box scores

---

## Getting Started

### Prerequisites

- Node.js 18+
- Go 1.25+
- Redis on `localhost:6379`

### Run locally

```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — Backend
cd backend && go run .

# Terminal 3 — React frontend
cd frontend && npm install && npm run dev
```

- API: `http://localhost:8081`
- React app: `http://localhost:8080`

### Optional: Angular frontend

```bash
cd frontend-angular && npm install && npm start
```

Open `http://localhost:4200`.

See `frontend/README.md` and `frontend-angular/README.md` for frontend-specific details.

---

## Project Structure

```text
backend/
  cache/          # Redis helpers (get/set, sets, MGET)
  espn/           # ESPN client and response mappers
  games/          # Scoreboard and game summary domain
  nba/            # Standings domain
  teams/          # Team, roster, and schedule domain
  main.go

frontend/
  src/lib/        # Typed API client
  src/pages/      # Route-level views
  src/components/ # Layout and UI

frontend-angular/
  src/app/core/   # Models and NbaApiService
  src/app/pages/  # Route-level components
```

---

## API Reference

All endpoints are under `/api/nba`.

```http
GET /api/nba/scoreboard
GET /api/nba/scoreboard?dates=20250711
GET /api/nba/games/:id

GET /api/nba/teams
GET /api/nba/teams/:id
GET /api/nba/teams/:id/roster
GET /api/nba/teams/:id/schedule

GET /api/nba/standings
```

---

## Resume Bullets

Copy-paste and adjust tense as needed:

- Built a full-stack NBA data platform with a Go REST API, Redis cache-aside layer, and React + Angular frontends serving live scores, standings, and box scores
- Designed an ESPN ingestion and normalization pipeline that maps heterogeneous upstream JSON into stable domain models exposed via 7 cached API endpoints
- Implemented Redis entity caching with batch `MGET`, set-based team game indexes, and merge logic to retain richer game detail across cache writes
- Developed a React dashboard with TanStack Query, typed API client, and shadcn/ui; ported the same feature set to Angular 21 to validate API-first architecture

**One-liner for a resume project line:**

> Full-stack NBA tracker — Go/Gin API with Redis caching, ESPN data normalization, and React + Angular clients

---

## Roadmap

- [ ] WebSocket push updates for live scores
- [ ] Player profile pages
- [ ] Advanced analytics, comparisons, and power rankings
- [ ] Community predictions and simulation tools

---

## Disclaimer

Independent project. Not affiliated with, endorsed by, or associated with the NBA, ESPN, or any NBA team.

---

## License

MIT

## Game push notifications

The deployed React client offers **Game alerts** on each unfinished game's detail
page. Opt in on each device for tipoff, halftime, and final score; disable alerts
from the same page. No account is required. Angular does not yet expose these controls.

Enable the server after generating a stable VAPID key pair:

```sh
cd backend
go run ./cmd/vapid-keys
```

Set these environment variables on the backend (or in the root Compose `.env`):

```dotenv
PUSH_ENABLED=1
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_SUBJECT=mailto:you@example.com
```

Keep the private key secret and retain both keys across deployments. Push is off
by default. Restart/redeploy after configuring. Serve the frontend over HTTPS
(localhost works for development), with `/sw.js` served from the frontend origin.
On iOS/iPadOS 16.4+, add the site to the Home Screen and open that app before
opting in. Browser/OS notification settings still control delivery. The service
worker handles notifications only; it does not cache pages or API responses.

The Go worker fetches watched game summaries directly from ESPN every 30 seconds,
independent of page traffic. It seeds each subscription from the current game
state, avoiding old alerts when opting in. Halftime uses ESPN's explicit halftime
status, not just a zero clock. No synthetic catch-up halftime or tipoff alerts are
sent if polling skips that phase. Final alerts require `completed: true`.
Unfinished game cache entries also now expire after 20 seconds to keep API reads
fresh, while final games retain the 24-hour cache.

Subscriptions and delivery progress live in Redis for up to seven days, with
completed and invalid (404/410) subscriptions removed. Compose enables AOF and a
named volume so progress survives container restarts. Other deployments must
provide persistent Redis, without eviction of `push:*` keys. Losing Redis data
loses subscriptions; clearing browser storage loses that device's management
key. The browser subscription alone does not restore saved game selections.

Failed deliveries retry while the event remains current. Notifications expire at
the push provider after five minutes. Redis leases and saved phase markers prevent
routine duplicate sends across instances; a crash between provider acceptance
and saving progress can still produce a duplicate (the notification tag collapses
matching alerts). Delivery is best effort, depends on ESPN freshness and device
availability, and is not a precise tipoff timer. Supported provider endpoints are
Chrome/FCM, Firefox, and Apple Web Push.
