import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { GameCardComponent } from '../../shared/components/game-card/game-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import {
  NbaApiService,
  prettyDate,
  shiftDate,
  todayYYYYMMDD,
} from '../../core/services/nba-api.service';
import { Game } from '../../core/models/nba.models';
import { cn } from '../../shared/utils/class-names';

@Component({
  selector: 'app-scoreboard',
  imports: [GameCardComponent, SkeletonComponent],
  template: `
    <div class="space-y-10">
      <section class="relative overflow-hidden rounded-2xl border border-border bg-gradient-court p-8 shadow-card">
        <div class="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="font-mono text-xs uppercase tracking-[0.2em] text-primary">Scoreboard</p>
            <h1 class="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">{{ prettyDate(date()) }}</h1>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ games().length }} game{{ games().length === 1 ? '' : 's' }}
              @if (grouped().live.length > 0) {
                <span class="ml-2 inline-flex items-center gap-1.5 text-live">
                  <span class="live-dot"></span> {{ grouped().live.length }} live
                </span>
              }
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="prevDay()"
              class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              aria-label="Previous day"
            >
              ← Prev
            </button>
            <button
              type="button"
              (click)="goToday()"
              [class]="
                cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  date() === today
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-surface hover:bg-surface-hover'
                )
              "
            >
              Today
            </button>
            <button
              type="button"
              (click)="nextDay()"
              class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              aria-label="Next day"
            >
              Next →
            </button>
          </div>
        </div>
        <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
      </section>

      @if (scoreboard.isLoading()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (i of skeletonSlots; track i) {
            <app-skeleton class="h-32" />
          }
        </div>
      } @else if (scoreboard.error()) {
        <div class="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Failed to load games.
          <button type="button" (click)="scoreboard.reload()" class="underline">Retry</button>
        </div>
      } @else if (games().length === 0) {
        <div class="rounded-xl border border-border bg-surface p-12 text-center text-muted-foreground">
          No games scheduled for this date.
        </div>
      } @else {
        <div class="space-y-8">
          @if (grouped().live.length > 0) {
            <section>
              <div class="mb-3 flex items-center gap-2">
                <span class="live-dot"></span>
                <h2 class="font-display text-sm font-semibold uppercase tracking-[0.18em] text-live">Live now</h2>
                <span class="font-mono text-xs text-muted-foreground">{{ grouped().live.length }}</span>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                @for (game of grouped().live; track game.id) {
                  <app-game-card [game]="game" />
                }
              </div>
            </section>
          }
          @if (grouped().upcoming.length > 0) {
            <section>
              <div class="mb-3 flex items-center gap-2">
                <h2 class="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Upcoming</h2>
                <span class="font-mono text-xs text-muted-foreground">{{ grouped().upcoming.length }}</span>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                @for (game of grouped().upcoming; track game.id) {
                  <app-game-card [game]="game" />
                }
              </div>
            </section>
          }
          @if (grouped().final.length > 0) {
            <section>
              <div class="mb-3 flex items-center gap-2">
                <h2 class="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Final</h2>
                <span class="font-mono text-xs text-muted-foreground">{{ grouped().final.length }}</span>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                @for (game of grouped().final; track game.id) {
                  <app-game-card [game]="game" />
                }
              </div>
            </section>
          }
        </div>
      }

      @if (scoreboard.status() === 'reloading') {
        <p class="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Refreshing…</p>
      }
    </div>
  `,
})
export class ScoreboardComponent {
  private readonly api = inject(NbaApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly date = signal(todayYYYYMMDD());
  protected readonly today = todayYYYYMMDD();
  protected readonly skeletonSlots = Array.from({ length: 8 }, (_, i) => i);
  protected readonly prettyDate = prettyDate;
  protected readonly cn = cn;

  protected readonly scoreboard = rxResource({
    params: () => this.date(),
    stream: ({ params }) => this.api.getScoreboard(params),
    defaultValue: [] as Game[],
  });

  protected readonly games = computed(() => this.scoreboard.value());

  protected readonly grouped = computed(() => {
    const list = this.games();
    return {
      live: list.filter((g) => g.state === 'in'),
      upcoming: list.filter((g) => g.state === 'pre'),
      final: list.filter((g) => g.state === 'post'),
    };
  });

  constructor() {
    effect(() => {
      const live = this.grouped().live.length;
      document.title =
        live > 0
          ? `(${live} LIVE) We Know Ball — NBA`
          : 'We Know Ball — NBA scores, standings & stats';
    });

    const pollId = setInterval(() => this.scoreboard.reload(), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(pollId));
  }

  prevDay(): void {
    this.date.update((d) => shiftDate(d, -1));
  }

  nextDay(): void {
    this.date.update((d) => shiftDate(d, 1));
  }

  goToday(): void {
    this.date.set(todayYYYYMMDD());
  }
}
