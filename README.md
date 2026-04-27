# WeKnowBall

A modern NBA tracker built with React + TypeScript that surfaces live scores, standings, team details, rosters, schedules, and game summaries.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- React Router
- TanStack Query
- Tailwind CSS + shadcn/ui primitives
- Vitest + Testing Library

## Features

- Live scoreboard with game status and matchup details
- Conference standings view
- Team directory and team detail pages
- Team rosters and schedules
- Individual game pages with summary/box score data
- Client-side data layer abstracted in `src/lib/nba-api.ts`

## Data Source

The app currently uses ESPN's public NBA endpoints through the API layer in `src/lib/nba-api.ts`.

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)

### Install Dependencies

Using npm:

```bash
npm install
```

Using bun:

```bash
bun install
```

### Run Development Server

Using npm:

```bash
npm run dev
```

Using bun:

```bash
bun run dev
```

Then open the local URL shown by Vite (typically `http://localhost:5173`).

## Available Scripts

- `dev` - start local dev server
- `build` - production build
- `build:dev` - development-mode build
- `preview` - preview production build locally
- `lint` - run ESLint
- `test` - run Vitest test suite once
- `test:watch` - run Vitest in watch mode

## Environment Variables

Create a `.env` file in the project root if you want custom endpoints:

```bash
VITE_NBA_API_BASE=https://site.api.espn.com/apis/site/v2/sports/basketball/nba
VITE_NBA_CORE_BASE=https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba
```

## Project Structure

```text
src/
  components/      # shared layout and UI composition
  lib/             # API client and shared helpers
  pages/           # route-level page components
  App.tsx          # routing + providers
  main.tsx         # application entry point
```
