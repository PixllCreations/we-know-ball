import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Game } from '../../../core/models/nba.models';
import { participantLogo } from '../../../core/services/nba-api.service';
import { cn } from '../../utils/class-names';

@Component({
  selector: 'app-game-card',
  imports: [RouterLink],
  template: `
    <div
      [class]="
        cn(
          'group block rounded-xl border border-border bg-gradient-stat p-4 shadow-card transition-all',
          'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated'
        )
      "
    >
      <a [routerLink]="['/games', game().id]" class="block">
        <div
          class="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider"
        >
          <div class="flex items-center gap-1.5">
            @if (isLive()) {
              <span class="live-dot"></span>
            }
            <span
              [class]="
                cn(
                  'text-muted-foreground',
                  isLive() && 'text-live font-semibold',
                  isFinal() && 'text-foreground'
                )
              "
            >
              {{ game().shortDetail }}
            </span>
          </div>
        </div>

        <div class="divide-y divide-border/50">
          <div class="flex items-center justify-between gap-3 py-2">
            <div class="flex min-w-0 items-center gap-3">
              @if (awayLogo()) {
                <img
                  [src]="awayLogo()"
                  [alt]="game().away.displayName + ' logo'"
                  class="h-8 w-8 object-contain"
                  loading="lazy"
                />
              } @else {
                <div class="h-8 w-8 rounded-full bg-muted"></div>
              }
              <div class="min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="font-display text-sm font-bold tracking-wide">{{
                    game().away.abbreviation
                  }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{
                    game().away.displayName
                  }}</span>
                </div>
                @if (game().away.records?.[0]?.displayValue) {
                  <div class="font-mono text-[10px] text-muted-foreground">
                    {{ game().away.records![0].displayValue }}
                  </div>
                }
              </div>
            </div>
            <div
              [class]="
                cn(
                  'tabular font-display text-2xl font-bold leading-none',
                  !game().away.score && 'text-muted-foreground',
                  isLive() && 'text-primary',
                  !isLive() && !game().away.winner && game().away.score && 'text-muted-foreground'
                )
              "
            >
              {{ game().away.score || '—' }}
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 py-2">
            <div class="flex min-w-0 items-center gap-3">
              @if (homeLogo()) {
                <img
                  [src]="homeLogo()"
                  [alt]="game().home.displayName + ' logo'"
                  class="h-8 w-8 object-contain"
                  loading="lazy"
                />
              } @else {
                <div class="h-8 w-8 rounded-full bg-muted"></div>
              }
              <div class="min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="font-display text-sm font-bold tracking-wide">{{
                    game().home.abbreviation
                  }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{
                    game().home.displayName
                  }}</span>
                </div>
                @if (game().home.records?.[0]?.displayValue) {
                  <div class="font-mono text-[10px] text-muted-foreground">
                    {{ game().home.records![0].displayValue }}
                  </div>
                }
              </div>
            </div>
            <div
              [class]="
                cn(
                  'tabular font-display text-2xl font-bold leading-none',
                  !game().home.score && 'text-muted-foreground',
                  isLive() && 'text-primary',
                  !isLive() && !game().home.winner && game().home.score && 'text-muted-foreground'
                )
              "
            >
              {{ game().home.score || '—' }}
            </div>
          </div>
        </div>
      </a>

      @if (showWatchOptions()) {
        <div class="mt-3 border-t border-border/60 pt-3">
          <button
            type="button"
            (click)="openDialog()"
            class="w-full rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-mono uppercase tracking-wider text-primary transition-colors hover:bg-primary/15"
            aria-label="Open watch options"
          >
            Where to Watch
          </button>
        </div>
      }

      @if (dialogOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            class="absolute inset-0 bg-black/60"
            (click)="closeDialog()"
            aria-label="Close dialog"
          ></button>
          <div
            class="relative z-10 w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-elevated"
          >
            <h2 class="font-display text-xl">{{ isLive() ? 'Watch Live' : 'Stream Options' }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ game().away.abbreviation }} at {{ game().home.abbreviation }}
            </p>
            <div class="mt-4 space-y-2">
              <a
                href="https://www.espn.com/watch/"
                target="_blank"
                rel="noreferrer"
                class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
              >
                <span>ESPN</span>
                <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >Open</span
                >
              </a>
              <a
                href="https://www.nba.com/watch"
                target="_blank"
                rel="noreferrer"
                class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
              >
                <span>NBA League Pass</span>
                <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >Open</span
                >
              </a>
            </div>
            <button
              type="button"
              (click)="closeDialog()"
              class="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-hover"
            >
              Close
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  protected readonly dialogOpen = signal(false);

  protected isLive = () => this.game().state === 'in';
  protected isFinal = () => this.game().state === 'post';
  protected showWatchOptions = () => !this.isFinal();
  protected awayLogo = () => participantLogo(this.game().away.logo, this.game().away.logos);
  protected homeLogo = () => participantLogo(this.game().home.logo, this.game().home.logos);
  protected readonly cn = cn;

  openDialog(): void {
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }
}
