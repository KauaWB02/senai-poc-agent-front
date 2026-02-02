import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>('light');

  constructor() {
    this.applyTheme(this.theme());
  }

  switchTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark') {
    const html = document.documentElement;

    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
