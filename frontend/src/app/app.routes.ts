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
        path: 'settings/users',
        loadComponent: () => import('./settings/users/users').then(m => m.Users),
      },
      {
        path: 'screens',
        loadComponent: () => import('./screens/screens').then(m => m.Screens),
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
        path: 'audit-log',
        loadComponent: () => import('./audit-log/audit-log').then(m => m.AuditLog),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
