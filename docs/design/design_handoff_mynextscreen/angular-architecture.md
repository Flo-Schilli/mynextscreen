# Angular 21 + Tailwind 4 — Architecture Guide

How to build myNextScreen idiomatically. Adapt to the repo's existing conventions
if one already exists; otherwise scaffold a fresh app as below.

## Scaffold
```bash
# Angular 21 — standalone + zoneless by default
ng new mynextscreen --style=css --ssr=false
cd mynextscreen
npm install tailwindcss @tailwindcss/postcss postcss
```
Tailwind 4 (CSS-first, no config file). Add the PostCSS plugin:
```js
// .postcssrc.json
{ "plugins": { "@tailwindcss/postcss": {} } }
```
Replace `src/styles.css` with the bundle's `tailwind-theme.css` (it already does
`@import "tailwindcss"`). Add fonts to `src/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```
Set initial theme attrs on `<html>`: `data-theme="dark" data-accent="indigo" data-density="regular"`.

## Modern Angular conventions (use these)
- **Standalone components** everywhere (no NgModules). `imports: [...]` on each component.
- **Signals** for all state: `signal()`, `computed()`, `effect()`. Component inputs
  via `input()` / `input.required()`, outputs via `output()`, two-way via `model()`.
- **New control flow** in templates: `@if`, `@for (x of xs; track x.id)`, `@switch`.
- **`ChangeDetectionStrategy.OnPush`** on every component; prefer **zoneless**
  (`provideZonelessChangeDetection()` in `app.config.ts`).
- **Lazy feature routes** with `loadComponent` / `loadChildren`.
- Host bindings via the `host: {}` metadata or `[class]`/`[style]` bindings — avoid
  manual DOM writes. Use `@angular/common` `NgClass`/`NgStyle` sparingly; prefer
  string class bindings.

## Suggested structure
```
src/
  styles.css                      # = tailwind-theme.css
  app/
    core/
      theme.service.ts            # signals: theme/accent/density → <html> attrs + localStorage
      auth.service.ts             # authed signal (demo: mns_authed)
      toast.service.ts            # toast signal array + push()/auto-dismiss
      org.service.ts              # current org + orgs
      icon/icon.component.ts      # <mns-icon name="screens" [size]="20"/> (SVG set)
    ui/                           # design-system primitives (see components.md)
      card/ btn/ badge/ status-dot/ bar/ ring/ avatar/ count/ select/ switch/
      empty/ overlay/ toast-host/ page-header/
    layout/
      app-shell/                  # authenticated shell: sidebar + topbar + <router-outlet>
      sidebar/ topbar/ user-menu/
    features/
      dashboard/                  # onboarding + populated (loadComponent)
      screens/  groups/  content/  playlists/  schedules/  streams/
      audit/    settings/  profile/
      instance-admin/             # elevated mode (own shell + 4 tabs)
        instance-admin.routes.ts
        instance-admin-shell/     # amber sidebar + topbar + header + tab bar
        tabs/dashboard/           # KPIs + storage + host disk + system-load + snapshots
        tabs/organisations/  tabs/users/  tabs/audit/
        load-graph/               # the CPU/RAM SVG chart component
        admin.mock.ts             # = admin_data.jsx (orgs, users, host, meta, LOAD, audit)
    data/
      mock.ts                     # = data.jsx (screens/content/playlists/…)
    app.routes.ts  app.config.ts  app.component.ts
```

## Routing
```ts
// app.routes.ts
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '', // authenticated shell
    loadComponent: () => import('./layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authedGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'screens',  loadComponent: () => import('./features/screens/screens.component').then(m => m.ScreensComponent) },
      // … groups, content, playlists, schedules, streams, audit, settings, profile
    ],
  },
  {
    path: 'instance-admin', // elevated mode = its own shell (NOT inside app-shell)
    canActivate: [instanceAdminGuard],
    loadChildren: () => import('./features/instance-admin/instance-admin.routes').then(m => m.routes),
  },
  { path: '**', redirectTo: '' },
];
```
Instance Admin renders its own sidebar/topbar; "Back to workspace" navigates to `/dashboard`.

## Theme service (signals → `<html>`)
```ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme   = signal<'dark'|'light'>((localStorage.getItem('theme') as any) ?? 'dark');
  accent  = signal<'indigo'|'teal'|'amber'|'blue'>('indigo');
  density = signal<'compact'|'regular'|'comfy'>('regular');
  constructor() {
    effect(() => {
      const el = document.documentElement;
      el.dataset['theme'] = this.theme();
      el.dataset['accent'] = this.accent();
      el.dataset['density'] = this.density();
      localStorage.setItem('theme', this.theme());
    });
  }
  toggle() { this.theme.update(t => t === 'dark' ? 'light' : 'dark'); }
}
```

## Tailwind usage notes
- Token utilities resolve via the `@theme inline` mapping in `tailwind-theme.css`:
  `bg-surface`, `bg-surface-2`, `bg-rail`, `text-text`, `text-muted`, `text-faint`,
  `border-border`, `border-border-strong`, `text-accent`, `bg-accent`,
  `bg-accent-soft`, `bg-online-dim` / `text-online`, etc.
- Gradients (logo/primary button/elevated tile) aren't single tokens — use arbitrary
  values: `bg-[linear-gradient(135deg,var(--accent),var(--accent-2))]`.
- Density-driven spacing: `gap-[var(--gap)]`, `p-[var(--card-pad)]`.
- Light/dark is **attribute-driven** (`data-theme`), not Tailwind's `dark:` variant —
  the semantic tokens already switch, so just use `bg-surface` everywhere.

## Icons
Port `reference/icons.jsx` into one `IconComponent` that renders an inline `<svg>`
(24 viewBox, `fill=none stroke=currentColor stroke-width=1.7 stroke-linecap=round
stroke-linejoin=round`), selected by a `name` input. Keep the exact path data.
Size via `[size]` input. No icon font, no emoji.

## Charts
The system-load chart is hand-rolled SVG (no chart lib needed) — port `LoadGraph`
verbatim (see `components.md`). If you later add more charts, a lightweight lib is
fine, but match these visuals: dashed gridlines, area+line for the primary series,
dashed line for the secondary, shaded annotation bands, mono axis labels.

## Animations & accessibility
- Use Angular animations or CSS classes for entrances; **never strand content at
  `opacity:0`** if the animation doesn't run. Honour `prefers-reduced-motion`.
- Keyboard: `Esc`/backdrop closes overlays & menus; focus-visible rings use
  `0 0 0 3px var(--accent-soft)`; hit targets ≥ comfortable size.
- Tables: keep them horizontally scrollable on narrow widths (`overflow-x-auto` with
  a `min-w-[…]` inner grid), as the prototype does.

## Data → services
Replace the mock files with real services returning signals/observables:
- `data.jsx` → `data/mock.ts` then a `ScreensService`, `ContentService`, etc.
- `admin_data.jsx` → `instance-admin/admin.mock.ts` then `InstanceAdminService`
  (orgs, users, host disk, meta, `load` for the chart, audit). The `LOAD` arrays are
  hourly samples — wire to a metrics endpoint (e.g. poll every N s, keep last 24h).
