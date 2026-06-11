/**
 * NBA data layer.
 *
 * All UI calls go through this module. It talks to our backend API and keeps
 * response shapes stable for the UI.
 *
 * Override at runtime/build via Vite env: VITE_NBA_API_BASE
 */

const BASE = import.meta.env.VITE_NBA_API_BASE ?? "http://localhost:8081/api/nba";

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
  summary: () => "summary",
  standings: () => "standings",
} as const;

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, `${BASE}/`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function request<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = buildUrl(path, params);
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

export interface TeamsListResponse {
  sports: { leagues: { teams: { team: TeamRef }[] }[] }[];
}

/** Team detail as returned by `GET teams/:id` (`record` is an object here, unlike the string on list views). */
export type TeamDetail = Omit<TeamRef, "record"> & {
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
  team: TeamRef;
  athletes: RosterAthlete[];
}

export interface TeamScheduleResponse {
  team: TeamRef;
  events: Game[];
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
  header: { competitions: { competitors: Competitor[]; status: GameStatus }[] };
  boxscore?: {
    teams: { team: TeamRef; statistics: { name: string; displayValue: string; label: string }[] }[];
    players?: {
      team: TeamRef;
      statistics: {
        names: string[];
        athletes: BoxscorePlayerAthleteStatLine[];
      }[];
    }[];
  };
  gameInfo?: { venue?: { fullName: string; address?: { city: string; state: string } }; attendance?: number };
  leaders?: {
    team: TeamRef;
    leaders: {
      name: string;
      displayName: string;
      leaders: { displayValue: string; athlete: { displayName: string; headshot?: string } }[];
    }[];
  }[];
}

export interface StandingsResponse {
  children: ConferenceStandings[];
}

/** One documented ESPN-backed response shape this app unmarshals into. */
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

/**
 * Enumerates JSON shapes for each ESPN-backed call this app expects.
 * Use `structs` as a blueprint for Go `json`-tagged types (nullable fields → pointers).
 *
 * Backend typically proxies:
 * - `scoreboard` → ESPN site `scoreboard`
 * - `teams` / `teams/:id` / roster / schedule → ESPN site team APIs
 * - `summary?event=` → ESPN site summary
 * - `standings` → standings API (often `site.web.api.espn.com` variant)
 */
export function listEspnApiResponseStructures(): EspnApiStructureSpec[] {
  return [
    {
      endpointId: "scoreboard",
      path: "scoreboard",
      queryParams: ["dates"],
      structs: {
        ScoreboardResponse: `{ events: Game[]; day?: { date: string } }`,
        Game: `{ id; date; name; shortName; status: GameStatus; competitions: Competition[] }`,
        GameStatus: `{ clock; displayClock; period; type: { id; name; state; completed; description; detail; shortDetail } }`,
        Competition: `{ id; venue?; competitors: Competitor[]; broadcasts?: { names: string[] }[] /* + geoBroadcasts, links… */ }`,
        Competitor: `{ id; homeAway; score; winner?; team: TeamRef; records?; linescores?: { value: number }[] }`,
        TeamRef: `{ id; abbreviation; displayName; shortDisplayName; name?; location?; color?; alternateColor?; logo?; logos?: { href }[]; record? }`,
      },
    },
    {
      endpointId: "teams",
      path: "teams",
      queryParams: [],
      structs: {
        TeamsListResponse: `{ sports: { leagues: { teams: { team: TeamRef }[] }[] }[] }`,
        TeamRef: "same as scoreboard.root TeamRef",
      },
    },
    {
      endpointId: "team",
      path: "teams/:teamId",
      queryParams: [],
      structs: {
        TeamDetailResponse: `{ team: TeamDetail }`,
        TeamDetail: `TeamRef & { record?: { items: { summary; stats: { name; value:number }[] }[] }; nextEvent?: Game[]; standingSummary?; groups?: { id; name } }`,
        Game: "same as ScoreboardResponse Game",
      },
    },
    {
      endpointId: "teamRoster",
      path: "teams/:teamId/roster",
      queryParams: [],
      structs: {
        TeamRosterResponse: `{ team: TeamRef; athletes: RosterAthlete[] }`,
        RosterAthlete: `{ id; fullName; displayName; jersey?; position?: { abbreviation }; height?; weight?; age?; experience?: { years }; headshot?: { href } }`,
      },
    },
    {
      endpointId: "teamSchedule",
      path: "teams/:teamId/schedule",
      queryParams: [],
      structs: {
        TeamScheduleResponse: `{ team: TeamRef; events: Game[] }`,
        Game: "same as scoreboard Game",
      },
    },
    {
      endpointId: "summary",
      path: "summary",
      queryParams: ["event"],
      structs: {
        GameSummaryResponse: `{ header; boxscore?; gameInfo?; leaders? /* many more keys possible */ }`,
        header: `{ competitions: { competitors: Competitor[]; status: GameStatus }[] }`,
        boxscore: `{ teams?: { team: TeamRef; statistics: { name; displayValue; label }[] }[]; players?: BoxscorePlayers[] }`,
        BoxscorePlayers: `{ team: TeamRef; statistics: { names: string[]; athletes: BoxscorePlayerAthleteStatLine[] }[] }`,
        BoxscorePlayerAthleteStatLine: `{ athlete: { id; displayName; shortName; jersey?; position?; headshot? }; stats: string[]; starter?; didNotPlay? }`,
        gameInfo: `{ venue?; attendance? /* + officials, weather… */ }`,
        leadersEntry: `{ team: TeamRef; leaders: { name; displayName; leaders: { displayValue; athlete: { displayName; headshot? } }[] }[] }`,
      },
    },
    {
      endpointId: "standings",
      path: "standings",
      queryParams: [],
      structs: {
        StandingsResponse: `{ children: ConferenceStandings[] }`,
        ConferenceStandings: `{ name; abbreviation; standings: { entries: StandingsTeam[] } }`,
        StandingsTeam: `{ team: TeamRef; stats: { name; abbreviation?; displayValue; value? }[] }`,
      },
    },
  ];
}

/* ---------- Endpoints ---------- */

export function getScoreboard(yyyymmdd?: string) {
  return request<ScoreboardResponse>(routes.scoreboard(), { dates: yyyymmdd }).then((data) => {
    if (import.meta.env.DEV) {
      console.groupCollapsed(`[ESPN scoreboard] ${yyyymmdd ?? "today"} - ${data.events?.length ?? 0} games`);
      for (const event of data.events ?? []) {
        const comp = event.competitions?.[0];
        const debugComp = comp as (Game["competitions"][number] & ScoreboardDebugEventExtras) | undefined;
        const debugEvent = event as Game & ScoreboardDebugEventExtras;
        console.log({
          id: event.id,
          name: event.name,
          state: event.status?.type?.state,
          statusDetail: event.status?.type?.shortDetail,
          broadcasts: comp?.broadcasts,
          geoBroadcasts: debugComp?.geoBroadcasts,
          links: debugEvent.links,
        });
      }
      console.groupEnd();
    }
    return data;
  });
}

export function getTeams() {
  return request<TeamsListResponse>(routes.teams());
}

export function getTeam(id: string) {
  return request<TeamDetailResponse>(routes.team(id));
}

export function getTeamRoster(id: string) {
  return request<TeamRosterResponse>(routes.teamRoster(id));
}

export function getTeamSchedule(id: string) {
  return request<TeamScheduleResponse>(routes.teamSchedule(id));
}

export function getGameSummary(eventId: string) {
  return request<GameSummaryResponse>(routes.summary(), { event: eventId });
}

export function getStandings() {
  return request<StandingsResponse>(routes.standings());
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
