import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  formatGameDate,
  inchesToFeet,
  NbaApiService,
} from '../../core/services/nba-api.service';
import { cn } from '../../shared/utils/class-names';

@Component({
  selector: 'app-team-detail',
  imports: [RouterLink, SkeletonComponent],
  template: `
    @if (teamResource.isLoading()) {
      <app-skeleton class="h-72" />
    } @else if (teamResource.error() || !team()) {
      <p class="text-destructive">Failed to load team.</p>
    } @else {
      <div class="space-y-10">
        <a routerLink="/teams" class="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
          ← All teams
        </a>

        <section
          class="relative overflow-hidden rounded-2xl border border-border p-8 shadow-card"
          [style.background]="heroBackground()"
        >
          <div class="flex flex-col items-start gap-6 md:flex-row md:items-center">
            @if (team()!.logos?.[0]?.href) {
              <img [src]="team()!.logos![0].href" [alt]="team()!.displayName + ' logo'" class="h-32 w-32 object-contain" />
            }
            <div>
              <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{{ team()!.location }}</p>
              <h1 class="mt-1 font-display text-5xl font-bold tracking-tight">{{ team()!.name }}</h1>
              <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
                @if (recordSummary()) {
                  <span class="rounded-md border border-border bg-surface-elevated px-3 py-1 font-mono">{{ recordSummary() }}</span>
                }
                @if (team()!.standingSummary) {
                  <span class="text-muted-foreground">{{ team()!.standingSummary }}</span>
                }
              </div>
            </div>
          </div>
        </section>

        @if (quickStats().length > 0) {
          <section class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            @for (stat of quickStats(); track stat.name) {
              <div class="rounded-lg border border-border bg-gradient-stat p-4">
                <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{{ stat.name }}</div>
                <div class="mt-1 tabular font-display text-2xl font-bold">{{ stat.value }}</div>
              </div>
            }
          </section>
        }

        <div class="grid gap-8 lg:grid-cols-3">
          <section class="lg:col-span-2">
            <h2 class="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Roster</h2>
            @if (rosterResource.isLoading()) {
              <app-skeleton class="h-96" />
            } @else {
              <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                <table class="w-full text-sm tabular">
                  <thead>
                    <tr class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th class="w-12 px-4 py-2">#</th>
                      <th class="px-4 py-2">Player</th>
                      <th class="px-3 py-2">Pos</th>
                      <th class="px-3 py-2 text-right">Ht</th>
                      <th class="px-3 py-2 text-right">Wt</th>
                      <th class="px-3 py-2 text-right">Age</th>
                      <th class="px-3 py-2 text-right">Exp</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (player of rosterResource.value(); track player.id) {
                      <tr class="border-b border-border/60 last:border-0 hover:bg-surface-hover">
                        <td class="px-4 py-2 font-mono text-xs text-muted-foreground">{{ player.jersey ?? '—' }}</td>
                        <td class="px-4 py-2">
                          <div class="flex items-center gap-2.5">
                            @if (player.headshot?.href) {
                              <img [src]="player.headshot!.href" alt="" class="h-8 w-8 rounded-full bg-muted object-cover" loading="lazy" />
                            } @else {
                              <div class="h-8 w-8 rounded-full bg-muted"></div>
                            }
                            <span class="font-medium">{{ player.displayName }}</span>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-muted-foreground">{{ player.position?.abbreviation ?? '—' }}</td>
                        <td class="px-3 py-2 text-right">{{ inchesToFeet(player.height) }}</td>
                        <td class="px-3 py-2 text-right">{{ player.weight ?? '—' }}</td>
                        <td class="px-3 py-2 text-right">{{ player.age ?? '—' }}</td>
                        <td class="px-3 py-2 text-right">{{ player.experience?.years ?? 0 }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section>
            <h2 class="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Schedule</h2>
            @if (scheduleResource.isLoading()) {
              <app-skeleton class="h-96" />
            } @else {
              <div class="space-y-2">
                @for (game of schedulePreview(); track game.id) {
                  <a
                    [routerLink]="['/games', game.id]"
                    class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
                  >
                    <div class="flex min-w-0 items-center gap-2.5">
                      @if (game.opponentLogo) {
                        <img [src]="game.opponentLogo" alt="" class="h-8 w-8 object-contain" loading="lazy" />
                      }
                      <div class="min-w-0">
                        <div class="truncate text-sm font-medium">
                          <span class="text-muted-foreground">{{ game.isHome ? 'vs' : '@' }}</span> {{ game.opponentAbbr }}
                        </div>
                        <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {{ formatGameDate(game.date) }}
                        </div>
                      </div>
                    </div>
                    @if (game.state === 'post') {
                      <div [class]="cn('text-right tabular text-sm font-semibold', game.won ? 'text-success' : 'text-muted-foreground')">
                        <div>{{ game.won ? 'W' : 'L' }}</div>
                        <div class="font-mono text-[10px]">{{ game.myScore }}-{{ game.oppScore }}</div>
                      </div>
                    } @else {
                      <div class="font-mono text-[10px] uppercase text-muted-foreground">
                        {{ game.shortDetail ?? formatGameDate(game.date) }}
                      </div>
                    }
                  </a>
                }
              </div>
            }
          </section>
        </div>
      </div>
    }
  `,
})
export class TeamDetailComponent {
  private readonly api = inject(NbaApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly teamId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly teamResource = rxResource({
    params: () => {
      const id = this.teamId();
      return id || undefined;
    },
    stream: ({ params: id }) => this.api.getTeam(id),
  });

  protected readonly rosterResource = rxResource({
    params: () => {
      const id = this.teamId();
      return id || undefined;
    },
    stream: ({ params: id }) => this.api.getTeamRoster(id),
    defaultValue: [],
  });

  protected readonly scheduleResource = rxResource({
    params: () => {
      const id = this.teamId();
      return id || undefined;
    },
    stream: ({ params: id }) => this.api.getTeamSchedule(id),
    defaultValue: [],
  });

  protected readonly team = computed(() => this.teamResource.value());
  protected readonly recordSummary = computed(() => this.team()?.record?.items?.[0]?.summary);
  protected readonly quickStats = computed(() => this.team()?.record?.items?.[0]?.stats?.slice(0, 6) ?? []);

  protected readonly heroBackground = computed(() => {
    const color = this.team()?.color;
    const accent = color ? `#${color}` : 'hsl(var(--primary))';
    return `radial-gradient(circle at 0% 0%, ${accent}33, transparent 60%), hsl(var(--surface))`;
  });

  protected readonly schedulePreview = computed(() => {
    const id = this.teamId();
    return this.scheduleResource
      .value()
      .slice(0, 12)
      .map((g) => {
        const isHome = g.home.id === id;
        const me = isHome ? g.home : g.away;
        const opp = isHome ? g.away : g.home;
        return {
          id: g.id,
          date: g.date,
          state: g.state,
          shortDetail: g.shortDetail,
          isHome,
          opponentAbbr: opp.abbreviation,
          opponentLogo: opp.logo ?? opp.logos?.[0]?.href,
          won: !!me.winner,
          myScore: me.score,
          oppScore: opp.score,
        };
      });
  });

  protected readonly formatGameDate = formatGameDate;
  protected readonly inchesToFeet = inchesToFeet;
  protected readonly cn = cn;
}
