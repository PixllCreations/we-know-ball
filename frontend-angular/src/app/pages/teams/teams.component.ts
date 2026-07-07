import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { NbaApiService } from '../../core/services/nba-api.service';

@Component({
  selector: 'app-teams',
  imports: [RouterLink, SkeletonComponent],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.2em] text-primary">Teams</p>
          <h1 class="mt-2 font-display text-4xl font-bold tracking-tight">All 30 NBA teams</h1>
        </div>
        <input
          [value]="query()"
          (input)="onSearch($event)"
          placeholder="Search teams…"
          class="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm outline-none transition-colors focus:border-primary md:w-72"
        />
      </header>

      @if (teamsResource.isLoading()) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          @for (i of skeletonSlots; track i) {
            <app-skeleton class="h-36" />
          }
        </div>
      } @else if (teamsResource.error()) {
        <div class="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">Failed to load teams.</div>
      } @else {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          @for (team of filteredTeams(); track team.id) {
            <a
              [routerLink]="['/teams', team.id]"
              class="group flex flex-col items-center gap-3 rounded-xl border border-border bg-gradient-stat p-5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              @if (team.logos?.[0]?.href) {
                <img
                  [src]="team.logos![0].href"
                  [alt]="team.displayName + ' logo'"
                  class="h-16 w-16 object-contain transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              } @else {
                <div class="h-16 w-16 rounded-full bg-muted"></div>
              }
              <div>
                <div class="font-display text-sm font-bold leading-tight">{{ team.name }}</div>
                <div class="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {{ team.abbreviation }} · {{ team.location }}
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class TeamsComponent {
  private readonly api = inject(NbaApiService);

  protected readonly query = signal('');
  protected readonly skeletonSlots = Array.from({ length: 30 }, (_, i) => i);

  protected readonly teamsResource = rxResource({
    stream: () => this.api.getTeams(),
    defaultValue: [],
  });

  protected readonly filteredTeams = computed(() => {
    const q = this.query().toLowerCase();
    const list = this.teamsResource.value();
    const filtered = q ? list.filter((t) => t.displayName.toLowerCase().includes(q)) : list;
    return [...filtered].sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
