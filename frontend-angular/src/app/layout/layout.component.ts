import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { cn } from '../shared/utils/class-names';

const NAV: { to: string; label: string; exact: boolean }[] = [
  { to: '/', label: 'Scores', exact: true },
  { to: '/standings', label: 'Standings', exact: false },
  { to: '/teams', label: 'Teams', exact: false },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gradient-hero text-foreground">
      <header class="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div class="container flex h-16 items-center gap-8">
          <a
            routerLink="/"
            class="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight"
          >
            <span
              class="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3v18M5.5 5.5l13 13M18.5 5.5l-13 13" />
              </svg>
            </span>
            <span>We<span class="text-primary">Know</span>Ball</span>
          </a>

          <nav class="flex items-center gap-1">
            @for (item of nav; track item.to) {
              <a
                [routerLink]="item.to"
                routerLinkActive="bg-surface-elevated text-foreground"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                [class]="
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                    'hover:bg-surface-hover hover:text-foreground'
                  )
                "
              >
                {{ item.label }}
              </a>
            }
          </nav>

          <div class="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span class="live-dot"></span>
            <span class="font-mono uppercase tracking-wider">Live data</span>
          </div>
        </div>
      </header>

      <main class="container py-8 animate-fade-in">
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {
  protected readonly nav = NAV;
  protected readonly cn = cn;
}
