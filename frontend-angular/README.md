# We Know Ball — Angular Frontend

Side-by-side Angular port of the React frontend, built for feature parity with the existing NBA tracker UI.

## Tech Stack

- Angular 21 (standalone components)
- TypeScript
- RxJS + `rxResource` for async data
- `HttpClient` API service
- Tailwind CSS (shared design tokens with the React app)

## Getting Started

Start the Go backend (from repo root):

```bash
cd backend
go run .
```

In another terminal, run the Angular dev server:

```bash
cd frontend-angular
npm start
```

Open [http://localhost:4200](http://localhost:4200). API calls proxy to `http://localhost:8081/api/nba`.

The React app continues to run separately on port 8080 via `frontend/`.

## Scripts

- `npm start` — dev server with API proxy
- `npm run build` — production build
- `npm run watch` — development build in watch mode

## Project Structure

```text
src/app/
  core/
    models/       # TypeScript interfaces mirroring the API
    services/     # NbaApiService (HttpClient)
  layout/         # Shell with nav + router outlet
  pages/          # Route-level components
  shared/         # Reusable UI (GameCard, Skeleton)
```

## Angular Patterns Used

- **Standalone components** — no NgModules
- **`inject()`** — functional dependency injection
- **Signals** — local UI state (`date`, search query)
- **`rxResource`** — declarative data fetching with loading/error states
- **`toSignal`** — route params bridged to signals
- **`computed`** — derived view state (grouped games, filtered teams)

## Environment

Edit `src/environments/environment.ts` to change the API base URL:

```typescript
export const environment = {
  production: false,
  nbaApiBase: '/api/nba',
};
```
