import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { ScoreboardComponent } from './pages/scoreboard/scoreboard.component';
import { StandingsComponent } from './pages/standings/standings.component';
import { TeamsComponent } from './pages/teams/teams.component';
import { TeamDetailComponent } from './pages/team-detail/team-detail.component';
import { GameDetailComponent } from './pages/game-detail/game-detail.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: ScoreboardComponent },
      { path: 'standings', component: StandingsComponent },
      { path: 'teams', component: TeamsComponent },
      { path: 'teams/:id', component: TeamDetailComponent },
      { path: 'games/:id', component: GameDetailComponent },
    ],
  },
  { path: '**', component: NotFoundComponent },
];
