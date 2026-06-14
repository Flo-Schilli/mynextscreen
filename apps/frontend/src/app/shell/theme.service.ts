import { computed, effect, Injectable, signal } from '@angular/core';

export type Theme = 'dark' | 'light';
export type Accent = 'indigo' | 'teal' | 'amber' | 'blue';
export type Density = 'compact' | 'regular' | 'comfy';

const STORAGE_KEY = 'signage_theme';
const ACCENT_KEY = 'signage_accent';
const DENSITY_KEY = 'signage_density';

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  // Migrate legacy value: 'light' → light, everything else → dark
  return stored === 'light' ? 'light' : 'dark';
}

function readAccent(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY);
  const valid: Accent[] = ['indigo', 'teal', 'amber', 'blue'];
  return valid.includes(stored as Accent) ? (stored as Accent) : 'indigo';
}

function readDensity(): Density {
  const stored = localStorage.getItem(DENSITY_KEY);
  const valid: Density[] = ['compact', 'regular', 'comfy'];
  return valid.includes(stored as Density) ? (stored as Density) : 'regular';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(readTheme());
  readonly accent = signal<Accent>(readAccent());
  readonly density = signal<Density>(readDensity());

  /** Convenience computed — consumers that only need dark/light boolean. */
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const el = document.documentElement;
      const t = this.theme();
      const a = this.accent();
      const d = this.density();

      el.dataset['theme'] = t;
      el.dataset['accent'] = a;
      el.dataset['density'] = d;

      localStorage.setItem(STORAGE_KEY, t);
      localStorage.setItem(ACCENT_KEY, a);
      localStorage.setItem(DENSITY_KEY, d);
    });
  }

  /** Toggle between dark and light theme. */
  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  /** Set the active accent palette. */
  setAccent(accent: Accent): void {
    this.accent.set(accent);
  }

  /** Set the active density. */
  setDensity(density: Density): void {
    this.density.set(density);
  }
}
