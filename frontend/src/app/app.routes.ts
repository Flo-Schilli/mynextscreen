import { Routes } from '@angular/router';
import { Login } from './login/login';
import { authGuard } from './auth/auth.guard';
import { Layout } from './shell/layout';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    canActivate: [authGuard],
    component: Layout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
      {
        path: 'admin/organisations',
        loadComponent: () => import('./admin/organisations/organisations').then(m => m.Organisations),
      },
      {
        path: 'settings/user',
        loadComponent: () => import('./settings/user/user-settings').then(m => m.UserSettings),
      },
      {
        path: 'settings/users',
        loadComponent: () => import('./settings/users/users').then(m => m.Users),
      },
      {
        path: 'settings/org/notifications',
        loadComponent: () => import('./settings/org/org-notification-config').then(m => m.OrgNotificationConfig),
      },
      {
        path: 'screens',
        loadComponent: () => import('./screens/screens').then(m => m.Screens),
      },
      {
        path: 'screen-groups',
        loadComponent: () => import('./screen-groups/screen-groups').then(m => m.ScreenGroups),
      },
      {
        path: 'screen-groups/:id',
        loadComponent: () => import('./screen-groups/screen-group-detail').then(m => m.ScreenGroupDetail),
      },
      {
        path: 'content',
        loadComponent: () => import('./content/content-library').then(m => m.ContentLibrary),
      },
      {
        path: 'playlists',
        loadComponent: () => import('./playlists/playlists').then(m => m.Playlists),
      },
      {
        path: 'schedules',
        loadComponent: () => import('./schedules/schedules').then(m => m.Schedules),
      },
      {
        path: 'live-streams',
        loadComponent: () => import('./live-streams/live-streams').then(m => m.LiveStreams),
      },
      {
        path: 'audit-log',
        loadComponent: () => import('./audit-log/audit-log').then(m => m.AuditLog),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
