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

export interface Game {
  id: string;
  date: string;
  name: string;
  shortName: string;
  state: 'pre' | 'in' | 'post' | '';
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
  boxscore?: Boxscore;
}

export interface Boxscore {
  teams?: BoxscoreTeam[];
  players?: BoxscorePlayers[];
}

export interface BoxscoreTeam {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo?: string;
    logos?: { href: string }[];
  };
  homeAway?: 'home' | 'away' | string;
  stats?: BoxscoreTeamStat[];
  displayOrder?: number;
}

export interface BoxscoreTeamStat {
  name: string;
  label: string;
  abbreviation?: string;
  displayValue: string;
}

export interface BoxscorePlayers {
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    logo?: string;
    logos?: { href: string }[];
  };
  columns: string[];
  rows: BoxscorePlayerLine[];
  totalsRow?: string[];
  displayOrder?: number;
}

export interface BoxscorePlayerLine {
  player: BoxscorePlayer;
  values: string[];
  starter?: boolean;
  didNotPlay?: boolean;
  reason?: string;
  ejected?: boolean;
}

export interface BoxscorePlayer {
  id: string;
  displayName: string;
  shortName?: string;
  jersey?: string;
  position?: string;
  headshot?: string;
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

export type TeamDetail = Omit<Team, 'record'> & {
  record?: { items: { summary: string; stats: { name: string; value: number }[] }[] };
  nextEvent?: Game[];
  standingSummary?: string;
  groups?: { id: string; name: string };
};

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
