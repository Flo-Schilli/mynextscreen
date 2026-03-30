import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'signage_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(true);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') {
      this.isDark.set(false);
      document.documentElement.classList.add('light');
    }
  }

  toggle(): void {
    const dark = !this.isDark();
    this.isDark.set(dark);
    if (dark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
  }
}
