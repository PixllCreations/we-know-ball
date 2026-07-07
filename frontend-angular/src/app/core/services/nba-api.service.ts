import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConferenceStandings,
  Game,
  RosterAthlete,
  Team,
  TeamDetail,
} from '../models/nba.models';

const routes = {
  scoreboard: () => 'scoreboard',
  teams: () => 'teams',
  team: (id: string) => `teams/${id}`,
  teamRoster: (id: string) => `teams/${id}/roster`,
  teamSchedule: (id: string) => `teams/${id}/schedule`,
  games: (id: string) => `games/${id}`,
  standings: () => 'standings',
} as const;

@Injectable({ providedIn: 'root' })
export class NbaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.nbaApiBase;

  getScoreboard(yyyymmdd?: string): Observable<Game[]> {
    return this.request<Game[]>(routes.scoreboard(), yyyymmdd ? { dates: yyyymmdd } : undefined);
  }

  getTeams(): Observable<Team[]> {
    return this.request<Team[]>(routes.teams());
  }

  getTeam(id: string): Observable<TeamDetail> {
    return this.request<TeamDetail>(routes.team(id));
  }

  getTeamRoster(id: string): Observable<RosterAthlete[]> {
    return this.request<RosterAthlete[]>(routes.teamRoster(id));
  }

  getTeamSchedule(id: string): Observable<Game[]> {
    return this.request<Game[]>(routes.teamSchedule(id));
  }

  getGame(id: string): Observable<Game> {
    return this.request<Game>(routes.games(id));
  }

  getStandings(): Observable<ConferenceStandings[]> {
    return this.request<ConferenceStandings[]>(routes.standings());
  }

  private request<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) httpParams = httpParams.set(key, value);
      }
    }
    const url = `${this.base}/${path}`;
    return this.http.get<T>(url, { params: httpParams });
  }
}

export function formatGameDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function todayYYYYMMDD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export function shiftDate(yyyymmdd: string, days: number): string {
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6) - 1;
  const day = +yyyymmdd.slice(6, 8);
  const dt = new Date(y, m, day);
  dt.setDate(dt.getDate() + days);
  return todayYYYYMMDD(dt);
}

export function prettyDate(yyyymmdd: string): string {
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6) - 1;
  const d = +yyyymmdd.slice(6, 8);
  return new Date(y, m, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function inchesToFeet(inches?: number): string {
  if (!inches) return '—';
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
}

export function participantLogo(logo?: string, logos?: { href: string }[]): string | undefined {
  return logo ?? logos?.[0]?.href;
}
