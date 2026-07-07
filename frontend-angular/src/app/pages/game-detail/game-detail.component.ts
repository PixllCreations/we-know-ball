import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  formatGameDate,
  NbaApiService,
  participantLogo,
} from '../../core/services/nba-api.service';
import { BoxscorePlayerLine, BoxscorePlayers, GameParticipant } from '../../core/models/nba.models';
import { cn } from '../../shared/utils/class-names';

@Component({
  selector: 'app-game-detail',
  imports: [RouterLink, SkeletonComponent],
  template: `
    @if (gameResource.isLoading()) {
      <app-skeleton class="h-96" />
    } @else if (gameResource.error() || !game()) {
      <p class="text-destructive">Failed to load game.</p>
    } @else {
      <div class="mx-auto max-w-5xl space-y-8">
        <a
          routerLink="/"
          class="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          ← Scoreboard
        </a>

        <section class="rounded-2xl border border-border bg-gradient-court p-6 shadow-card md:p-8">
          <div
            class="mb-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground"
          >
            {{ formatGameDate(game()!.date) }}
          </div>

          @if (game()!.headline) {
            <p class="mb-4 text-center font-display text-lg font-semibold text-foreground/90">
              {{ game()!.headline }}
            </p>
          }

          <div
            class="mb-8 flex items-center justify-center gap-2 font-mono text-base uppercase tracking-widest md:text-lg"
          >
            @if (isLive()) {
              <span class="live-dot"></span>
            }
            <span [class]="cn('text-muted-foreground', isLive() && 'text-live font-semibold')">
              {{ game()!.detail || game()!.shortDetail || game()!.status }}
            </span>
          </div>

          <div class="mx-auto flex max-w-3xl items-center justify-between gap-6">
            <div class="flex flex-1 items-center gap-6">
              @if (awayLogo()) {
                <img
                  [src]="awayLogo()"
                  alt=""
                  class="h-28 w-28 shrink-0 object-contain md:h-32 md:w-32"
                />
              } @else {
                <div class="h-28 w-28 shrink-0 rounded-full bg-muted md:h-32 md:w-32"></div>
              }
              <div class="min-w-0 text-center">
                <div
                  [class]="
                    cn(
                      'tabular font-display text-7xl font-bold leading-none md:text-8xl',
                      game()!.away.winner ? 'text-foreground' : 'text-muted-foreground'
                    )
                  "
                >
                  {{ game()!.away.score || '—' }}
                </div>
                <div class="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">
                  {{ game()!.away.displayName }}
                </div>
                <div
                  class="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:text-sm"
                >
                  {{ awayRecord() }}
                </div>
              </div>
            </div>

            <div
              class="font-display text-2xl font-bold uppercase tracking-widest text-muted-foreground md:text-3xl"
            >
              {{ isFinal() ? 'final' : 'vs' }}
            </div>

            <div class="flex flex-1 flex-row-reverse items-center gap-6 text-right">
              @if (homeLogo()) {
                <img
                  [src]="homeLogo()"
                  alt=""
                  class="h-28 w-28 shrink-0 object-contain md:h-32 md:w-32"
                />
              } @else {
                <div class="h-28 w-28 shrink-0 rounded-full bg-muted md:h-32 md:w-32"></div>
              }
              <div class="min-w-0 text-center">
                <div
                  [class]="
                    cn(
                      'tabular font-display text-7xl font-bold leading-none md:text-8xl',
                      game()!.home.winner ? 'text-foreground' : 'text-muted-foreground'
                    )
                  "
                >
                  {{ game()!.home.score || '—' }}
                </div>
                <div class="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">
                  {{ game()!.home.displayName }}
                </div>
                <div
                  class="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:text-sm"
                >
                  {{ homeRecord() }}
                </div>
              </div>
            </div>
          </div>

          @if (game()!.venue || game()!.attendance) {
            <div
              class="mt-8 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              {{ game()!.venue?.fullName }}
              @if (game()!.venue?.city && game()!.venue?.state) {
                · {{ game()!.venue!.city }}, {{ game()!.venue!.state }}
              }
              @if (game()!.attendance) {
                · {{ game()!.attendance!.toLocaleString() }} attendance
              }
            </div>
          }
        </section>

        @if (game()!.leaders && game()!.leaders!.length > 0) {
          <section>
            <h2
              class="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              Game leaders
            </h2>
            <div class="grid gap-3 sm:grid-cols-3">
              @for (leader of game()!.leaders!; track leader.category + leader.athlete) {
                <div class="rounded-xl border border-border bg-surface p-4 shadow-card">
                  <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {{ leader.displayName }}
                  </div>
                  <div class="mt-1 font-medium">{{ leader.athlete }}</div>
                  <div class="mt-1 tabular font-display text-2xl font-bold">{{ leader.value }}</div>
                </div>
              }
            </div>
          </section>
        }

        @if (boxscoreTeams().length > 0 || boxscorePlayers().length > 0) {
          <section class="space-y-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2
                class="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Box scores
              </h2>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="setViewMode('team')"
                  [class]="
                    cn(
                      'rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors',
                      viewMode() === 'team'
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    )
                  "
                >
                  Team Boxscore
                </button>
                <button
                  type="button"
                  (click)="setViewMode('player')"
                  [class]="
                    cn(
                      'rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors',
                      viewMode() === 'player'
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    )
                  "
                >
                  Player Boxscores
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="setSelectedSide('away')"
                [class]="
                  cn(
                    'rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors',
                    selectedSide() === 'away'
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  )
                "
              >
                {{ game()!.away.abbreviation }}
              </button>
              <button
                type="button"
                (click)="setSelectedSide('home')"
                [class]="
                  cn(
                    'rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors',
                    selectedSide() === 'home'
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  )
                "
              >
                {{ game()!.home.abbreviation }}
              </button>
            </div>

            @if (viewMode() === 'team' && selectedTeamBlock()) {
              <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                <header
                  class="flex items-center gap-2 border-b border-border bg-gradient-stat px-4 py-3"
                >
                  @if (teamLogo(selectedTeamBlock()!.team)) {
                    <img
                      [src]="teamLogo(selectedTeamBlock()!.team)"
                      alt=""
                      class="h-6 w-6 object-contain"
                    />
                  }
                  <h3 class="font-display text-base font-semibold">
                    {{ selectedTeamBlock()!.team.displayName }}
                  </h3>
                </header>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm tabular">
                    <thead>
                      <tr
                        class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                      >
                        <th class="px-3 py-2">Stat</th>
                        <th class="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of selectedTeamBlock()!.stats ?? []; track row.name) {
                        <tr class="border-b border-border/60 last:border-0">
                          <td class="px-3 py-2 font-medium">
                            {{ row.label || row.abbreviation || row.name }}
                          </td>
                          <td class="px-3 py-2 text-right">{{ row.displayValue }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (viewMode() === 'player' && selectedPlayerBlock()) {
              <div class="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                <header
                  class="flex items-center gap-2 border-b border-border bg-gradient-stat px-4 py-3"
                >
                  @if (teamLogo(selectedPlayerBlock()!.team)) {
                    <img
                      [src]="teamLogo(selectedPlayerBlock()!.team)"
                      alt=""
                      class="h-6 w-6 object-contain"
                    />
                  }
                  <h3 class="font-display text-base font-semibold">
                    {{ selectedPlayerBlock()!.team.displayName }}
                  </h3>
                </header>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm tabular">
                    <thead>
                      <tr
                        class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                      >
                        <th class="px-3 py-2">Player</th>
                        @for (col of playerColumns(selectedPlayerBlock()!); track col) {
                          <th class="px-3 py-2 text-right">{{ col }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (line of selectedPlayerBlock()!.rows; track line.player.id) {
                        <tr class="border-b border-border/60 last:border-0 hover:bg-surface-hover">
                          <td class="px-3 py-2">
                            <div class="flex items-center gap-2">
                              @if (line.player.headshot) {
                                <img
                                  [src]="line.player.headshot"
                                  alt=""
                                  class="h-7 w-7 rounded-full bg-muted object-cover"
                                />
                              }
                              <span class="font-medium">{{ line.player.displayName }}</span>
                              @if (line.didNotPlay) {
                                <span class="font-mono text-[10px] text-muted-foreground">DNP</span>
                              }
                            </div>
                          </td>
                          @for (col of playerColumns(selectedPlayerBlock()!); track col) {
                            <td class="px-3 py-2 text-right">
                              {{ playerStatForColumn(selectedPlayerBlock()!, line, col) }}
                            </td>
                          }
                        </tr>
                      }
                      @if (selectedPlayerBlock()!.totalsRow?.length) {
                        <tr class="bg-surface-elevated font-semibold">
                          <td class="px-3 py-2">Team</td>
                          @for (col of playerColumns(selectedPlayerBlock()!); track col) {
                            <td class="px-3 py-2 text-right">
                              {{ totalForColumn(selectedPlayerBlock()!, col) }}
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </section>
        }

        @if (game()!.notes && game()!.notes!.length > 0) {
          <section
            class="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground"
          >
            @for (note of game()!.notes!; track note.type + note.headline) {
              <p>{{ note.headline }}</p>
            }
          </section>
        }
      </div>
    }
  `,
})
export class GameDetailComponent {
  private readonly api = inject(NbaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly gameId = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly gameResource = rxResource({
    params: () => {
      const id = this.gameId();
      return id || undefined;
    },
    stream: ({ params: id }) => this.api.getGame(id),
  });

  protected readonly game = computed(() => this.gameResource.value());
  protected readonly isLive = computed(() => this.game()?.state === 'in');
  protected readonly isFinal = computed(() => this.game()?.state === 'post');
  protected readonly awayLogo = computed(() => {
    const g = this.game();
    return g ? participantLogo(g.away.logo, g.away.logos) : undefined;
  });
  protected readonly homeLogo = computed(() => {
    const g = this.game();
    return g ? participantLogo(g.home.logo, g.home.logos) : undefined;
  });
  protected readonly awayRecord = computed(() => this.participantRecord(this.game()?.away));
  protected readonly homeRecord = computed(() => this.participantRecord(this.game()?.home));
  protected readonly boxscoreTeams = computed(() => this.game()?.boxscore?.teams ?? []);
  protected readonly boxscorePlayers = computed(() => this.game()?.boxscore?.players ?? []);
  protected readonly viewMode = signal<'team' | 'player'>('team');
  protected readonly selectedSide = signal<'away' | 'home'>('away');
  protected readonly selectedTeamBlock = computed(() => {
    const side = this.selectedSide();
    const teams = this.boxscoreTeams();
    return (
      teams.find((t) => t.homeAway === side) ?? (side === 'away' ? teams[0] : teams[1]) ?? null
    );
  });
  protected readonly selectedPlayerBlock = computed(() => {
    const blocks = this.boxscorePlayers();
    const teamId = this.selectedTeamBlock()?.team.id;
    const picked = blocks.find((b) => b.team.id === teamId);
    return picked ?? (this.selectedSide() === 'away' ? blocks[0] : blocks[1]) ?? blocks[0] ?? null;
  });
  protected readonly teamStatsRows = computed(() => {
    const away = this.boxscoreTeams().find((t) => t.homeAway === 'away') ?? this.boxscoreTeams()[0];
    const home = this.boxscoreTeams().find((t) => t.homeAway === 'home') ?? this.boxscoreTeams()[1];
    if (!away || !home) return [];

    const homeMap = new Map((home.stats ?? []).map((s) => [s.name, s]));
    return (away.stats ?? []).map((a) => ({
      key: a.name,
      label: a.label || a.abbreviation || a.name,
      away: a.displayValue,
      home: homeMap.get(a.name)?.displayValue ?? '—',
    }));
  });

  protected readonly formatGameDate = formatGameDate;
  protected readonly cn = cn;

  constructor() {
    const pollId = setInterval(() => this.gameResource.reload(), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(pollId));
  }

  private participantRecord(team?: GameParticipant): string {
    if (!team) return '';
    return (
      team.records?.find((r) => r.type === 'total')?.displayValue ??
      team.records?.[0]?.displayValue ??
      team.abbreviation
    );
  }

  protected teamLogo(team: { logo?: string; logos?: { href: string }[] }): string | undefined {
    return team.logo ?? team.logos?.[0]?.href;
  }

  protected setViewMode(mode: 'team' | 'player'): void {
    this.viewMode.set(mode);
  }

  protected setSelectedSide(side: 'away' | 'home'): void {
    this.selectedSide.set(side);
  }

  protected playerColumns(block: BoxscorePlayers): string[] {
    const labels = block.columns;
    const preferred = ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'TO', 'STL', 'BLK', '+/-'];
    const shown = preferred.filter((p) => labels.includes(p));
    return shown.length > 0 ? shown : labels;
  }

  protected playerStatForColumn(
    block: BoxscorePlayers,
    line: BoxscorePlayerLine,
    col: string,
  ): string {
    const idx = this.columnIndex(block, col);
    if (idx < 0) return '—';
    return line.values?.[idx] ?? '—';
  }

  protected totalForColumn(block: BoxscorePlayers, col: string): string {
    const idx = this.columnIndex(block, col);
    if (idx < 0) return '—';
    return block.totalsRow?.[idx] ?? '—';
  }

  private columnIndex(block: BoxscorePlayers, col: string): number {
    const labels = block.columns;
    return labels.indexOf(col);
  }
}
