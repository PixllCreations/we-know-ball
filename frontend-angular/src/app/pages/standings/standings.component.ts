import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { NbaApiService } from '../../core/services/nba-api.service';
import { StandingsTeam } from '../../core/models/nba.models';
import { cn } from '../../shared/utils/class-names';

const COLS: { key: string; label: string; align?: 'right' }[] = [
  { key: 'wins', label: 'W', align: 'right' },
  { key: 'losses', label: 'L', align: 'right' },
  { key: 'winPercent', label: 'PCT', align: 'right' },
  { key: 'gamesBehind', label: 'GB', align: 'right' },
  { key: 'streak', label: 'STRK', align: 'right' },
];

function statValue(team: StandingsTeam, key: string): string {
  const s = team.stats.find((x) => x.name === key);
  return s?.displayValue ?? '—';
}

function seedClass(index: number): string {
  if (index < 6) return 'text-success';
  if (index < 10) return 'text-warning';
  return 'text-muted-foreground';
}

function conferenceLabel(name: string): string {
  return `${name}ern Conference`.replace(/ernern/, 'ern');
}

@Component({
  selector: 'app-standings',
  imports: [RouterLink, SkeletonComponent],
  template: `
    <div class="space-y-8">
      <header>
        <p class="font-mono text-xs uppercase tracking-[0.2em] text-primary">Standings</p>
        <h1 class="mt-2 font-display text-4xl font-bold tracking-tight">Conference standings</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Top 6 clinch playoffs · 7–10 enter the play-in tournament.
        </p>
      </header>

      @if (standings.isLoading()) {
        <div class="grid gap-6 lg:grid-cols-2">
          <app-skeleton class="h-[640px]" />
          <app-skeleton class="h-[640px]" />
        </div>
      } @else if (standings.error()) {
        <div class="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Failed to load standings.
        </div>
      } @else {
        <div class="grid gap-6 lg:grid-cols-2">
          @for (conf of standings.value(); track conf.abbreviation) {
            <section class="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <header class="flex items-center justify-between border-b border-border bg-gradient-stat px-5 py-3">
                <h2 class="font-display text-lg font-bold tracking-tight">{{ conferenceLabel(conf.name) }}</h2>
                <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {{ conf.standings.entries.length }} teams
                </span>
              </header>
              <div class="overflow-x-auto">
                <table class="w-full text-sm tabular">
                  <thead>
                    <tr class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th class="w-10 px-4 py-2">#</th>
                      <th class="px-4 py-2">Team</th>
                      @for (col of cols; track col.key) {
                        <th [class]="cn('px-3 py-2', col.align === 'right' && 'text-right')">{{ col.label }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (entry of conf.standings.entries; track entry.team.id; let i = $index) {
                      <tr class="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover">
                        <td [class]="cn('px-4 py-3 font-mono text-xs font-semibold', seedClass(i))">{{ i + 1 }}</td>
                        <td class="px-4 py-3">
                          <a [routerLink]="['/teams', entry.team.id]" class="group flex items-center gap-2.5">
                            @if (entry.team.logos?.[0]?.href) {
                              <img [src]="entry.team.logos![0].href" alt="" class="h-6 w-6 object-contain" loading="lazy" />
                            } @else {
                              <div class="h-6 w-6 rounded-full bg-muted"></div>
                            }
                            <span class="font-medium transition-colors group-hover:text-primary">{{ entry.team.displayName }}</span>
                          </a>
                        </td>
                        @for (col of cols; track col.key) {
                          <td [class]="cn('px-3 py-3 text-foreground/90', col.align === 'right' && 'text-right')">
                            {{ statValue(entry, col.key) }}
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          }
        </div>
      }
    </div>
  `,
})
export class StandingsComponent {
  private readonly api = inject(NbaApiService);

  protected readonly cols = COLS;
  protected readonly cn = cn;
  protected readonly statValue = statValue;
  protected readonly seedClass = seedClass;
  protected readonly conferenceLabel = conferenceLabel;

  protected readonly standings = rxResource({
    stream: () => this.api.getStandings(),
    defaultValue: [],
  });
}
