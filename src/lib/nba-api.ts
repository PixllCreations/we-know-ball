/**
 * NBA data layer.
 *
 * All UI calls go through this module. Today it talks directly to ESPN's
 * public (undocumented) endpoints. When you wire your own backend, change
 * `BASE` to your API root and keep the same shapes — UI won't need to change.
 *
 * Override at runtime/build via Vite env: VITE_NBA_API_BASE
 */

const BASE =
  import.meta.env.VITE_NBA_API_BASE ??
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

const CORE =
  import.meta.env.VITE_NBA_CORE_BASE ??
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NBA API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

/* ---------- Types (narrow subset of ESPN's response we actually use) ---------- */

export interface TeamRef {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name?: string;
  location?: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  logos?: { href: string }[];
  record?: string;
}

export interface Competitor {
  id: string;
  homeAway: "home" | "away";
  score: string;
  winner?: boolean;
  team: TeamRef;
  records?: { summary: string; type: string }[];
  linescores?: { value: number }[];
}

export interface GameStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: "pre" | "in" | "post";
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface Game {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: GameStatus;
  competitions: {
    id: string;
    venue?: { fullName: string; address?: { city: string; state: string } };
    competitors: Competitor[];
    broadcasts?: { names: string[] }[];
  }[];
}

export interface ScoreboardResponse {
  events: Game[];
  day?: { date: string };
}

export interface StandingsTeam {
  team: TeamRef;
  stats: { name: string; abbreviation?: string; displayValue: string; value?: number }[];
}

export interface ConferenceStandings {
  name: string;
  abbreviation: string;
  standings: { entries: StandingsTeam[] };
}

/* ---------- Endpoints ---------- */

export function getScoreboard(yyyymmdd?: string) {
  const q = yyyymmdd ? `?dates=${yyyymmdd}` : "";
  return get<ScoreboardResponse>(`${BASE}/scoreboard${q}`);
}

export function getTeams() {
  return get<{
    sports: { leagues: { teams: { team: TeamRef }[] }[] }[];
  }>(`${BASE}/teams`);
}

export function getTeam(id: string) {
  return get<{
    team: TeamRef & {
      record?: { items: { summary: string; stats: { name: string; value: number }[] }[] };
      nextEvent?: Game[];
      standingSummary?: string;
      groups?: { id: string; name: string };
    };
  }>(`${BASE}/teams/${id}`);
}

export function getTeamRoster(id: string) {
  return get<{
    team: TeamRef;
    athletes: {
      id: string;
      fullName: string;
      displayName: string;
      jersey?: string;
      position?: { abbreviation: string };
      height?: number;
      weight?: number;
      age?: number;
      experience?: { years: number };
      headshot?: { href: string };
    }[];
  }>(`${BASE}/teams/${id}/roster`);
}

export function getTeamSchedule(id: string) {
  return get<{ team: TeamRef; events: Game[] }>(`${BASE}/teams/${id}/schedule`);
}

export function getGameSummary(eventId: string) {
  return get<{
    header: { competitions: { competitors: Competitor[]; status: GameStatus }[] };
    boxscore?: {
      teams: { team: TeamRef; statistics: { name: string; displayValue: string; label: string }[] }[];
      players?: {
        team: TeamRef;
        statistics: {
          names: string[];
          athletes: {
            athlete: { id: string; displayName: string; shortName: string; jersey?: string; position?: { abbreviation: string }; headshot?: { href: string } };
            stats: string[];
            starter?: boolean;
            didNotPlay?: boolean;
          }[];
        }[];
      }[];
    };
    gameInfo?: { venue?: { fullName: string; address?: { city: string; state: string } }; attendance?: number };
    leaders?: { team: TeamRef; leaders: { name: string; displayName: string; leaders: { displayValue: string; athlete: { displayName: string; headshot?: string } }[] }[] }[];
  }>(`${BASE}/summary?event=${eventId}`);
}

export function getStandings() {
  // The site API returns combined standings; we use the v2 standings for cleaner conf split.
  return get<{ children: ConferenceStandings[] }>(
    `https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?level=2`,
  );
}

/* ---------- Helpers ---------- */

export function formatGameDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function todayYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export const _internal = { BASE, CORE };
