/**
 * NBA data layer.
 *
 * All UI calls go through this module. It talks to our backend API and keeps
 * response shapes stable for the UI.
 *
 * Override at runtime/build via Vite env: VITE_NBA_API_BASE
 */

const BASE = import.meta.env.VITE_NBA_API_BASE ?? "/api/nba";

interface ScoreboardDebugEventExtras {
  geoBroadcasts?: unknown;
  links?: unknown;
}

const routes = {
  scoreboard: () => "scoreboard",
  teams: () => "teams",
  team: (id: string) => `teams/${id}`,
  teamRoster: (id: string) => `teams/${id}/roster`,
  teamSchedule: (id: string) => `teams/${id}/schedule`,
  games: (id: string) => `games/${id}`,
  standings: () => "standings",
} as const;

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${BASE}/${path}?${qs}` : `${BASE}/${path}`;
}

async function request<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NBA API ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

/* ---------- Types (narrow subset of ESPN's response we actually use) ---------- */

export interface Team {
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
  team: Team;
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

export interface GameParticipant {
  id: string;
  abbreviation: string;
  displayName: string;
  logo?: string;
  logos?: { href: string }[];
  score?: string;
  winner?: boolean;
  records?: { type: string; displayValue: string }[];
}

export interface GameLeader {
  category: string;
  displayName: string;
  abbreviation?: string;
  value: string;
  athleteId?: string;
  athlete: string;
}

/** Shared flat game shape returned by scoreboard and team schedule endpoints. */
export interface Game {
  id: string;
  date: string;
  name: string;
  shortName: string;
  state: "pre" | "in" | "post" | "";
  status: string;
  shortDetail?: string;
  detail?: string;
  completed: boolean;
  clock?: number;
  displayClock?: string;
  period?: number;
  headline?: string;
  venue?: { fullName: string; city?: string; state?: string };
  attendance?: number;
  neutralSite?: boolean;
  home: GameParticipant;
  away: GameParticipant;
  leaders?: GameLeader[];
  notes?: { type: string; headline: string }[];
}

export interface StandingsTeam {
  team: Team;
  stats: { name: string; abbreviation?: string; displayValue: string; value?: number }[];
}

export interface ConferenceStandings {
  name: string;
  abbreviation: string;
  standings: { entries: StandingsTeam[] };
}

/** Team detail as returned by `GET teams/:id` (`record` is an object here, unlike the string on list views). */
export type TeamDetail = Omit<Team, "record"> & {
  record?: { items: { summary: string; stats: { name: string; value: number }[] }[] };
  nextEvent?: Game[];
  standingSummary?: string;
  groups?: { id: string; name: string };
};

export interface TeamDetailResponse {
  team: TeamDetail;
}

export interface RosterAthlete {
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
}

export interface TeamRosterResponse {
  athletes: RosterAthlete[];
}

export interface BoxscorePlayerAthleteStatLine {
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
    jersey?: string;
    position?: { abbreviation: string };
    headshot?: { href: string };
  };
  stats: string[];
  starter?: boolean;
  didNotPlay?: boolean;
}

export interface GameSummaryResponse {
  competitions: { competitors: Competitor[]; status: GameStatus }[];
  boxscore?: {
    teams: { team: Team; statistics: { name: string; displayValue: string; label: string }[] }[];
    players?: {
      team: Team;
      statistics: {
        names: string[];
        athletes: BoxscorePlayerAthleteStatLine[];
      }[];
    }[];
  };
  gameInfo?: { venue?: { fullName: string; address?: { city: string; state: string } }; attendance?: number };
  leaders?: {
    team: Team;
    leaders: {
      name: string;
      displayName: string;
      leaders: { displayValue: string; athlete: { displayName: string; headshot?: string } }[];
    }[];
  }[];
}

export interface EspnApiStructureSpec {
  /** Stable id for codegen / backend route mapping */
  endpointId: keyof typeof routes;
  /** Path segment under `/api/nba` (frontend client) */
  path: string;
  /** Query params the client forwards */
  queryParams: string[];
  /** Root JSON type plus nested types you likely want as separate Go structs */
  structs: Record<string, string>;
}

/* ---------- Endpoints ---------- */

export async function getScoreboard(yyyymmdd?: string) {
  const games = await request<Game[]>(routes.scoreboard(), { dates: yyyymmdd });

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[scoreboard] ${yyyymmdd ?? "today"} - ${games.length} games`);
    for (const game of games) {
      const debugGame = game as Game & ScoreboardDebugEventExtras;
      console.log({
        id: game.id,
        name: game.name,
        state: game.state,
        statusDetail: game.shortDetail,
        links: debugGame.links,
      });
    }
    console.groupEnd();
  }
  return games;
}

export function getTeams() {
  return request<Team[]>(routes.teams());
}

export function getTeam(id: string) {
  return request<TeamDetail>(routes.team(id));
}

export function getTeamRoster(id: string) {
  return request<RosterAthlete[]>(routes.teamRoster(id));
}

export function getTeamSchedule(id: string) {
  return request<Game[]>(routes.teamSchedule(id));
}

export function getGame(id: string) {
  return request<Game>(routes.games(id));
}

export function getStandings() {
  return request<ConferenceStandings[]>(routes.standings());
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

export const _internal = { BASE, routes, buildUrl };
