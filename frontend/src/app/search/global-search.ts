import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { SearchService } from './search.service';
import { SearchResults } from './search.model';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, finalize } from 'rxjs';

@Component({
  selector: 'app-global-search',
  template: `
    <div class="search-box" [class.focused]="focused()">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      @if (loading()) {
        <svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" opacity="0.25"/>
          <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      }
      <input
        #searchInput
        type="text"
        class="search-input"
        placeholder="Search\u2026"
        [value]="query()"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
        (keydown.escape)="onEscape()"
      />
      <kbd class="shortcut-hint" [class.hidden]="focused()">Ctrl+K</kbd>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 0.375rem 0.75rem;
      position: relative;
      transition: border-color 0.15s;
    }
    .search-box.focused {
      border-color: var(--color-accent);
    }

    .search-icon {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .spinner {
      position: absolute;
      left: 0.75rem;
      color: var(--color-accent);
      flex-shrink: 0;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .search-input {
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      width: 160px;
      outline: none;
    }
    .search-input::placeholder {
      color: var(--color-text-muted);
    }

    .shortcut-hint {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 1px 5px;
      white-space: nowrap;
      pointer-events: none;
      line-height: 1.4;
    }
    .shortcut-hint.hidden {
      display: none;
    }
  `,
})
export class GlobalSearch implements OnInit, OnDestroy {
  private searchService = inject(SearchService);

  @ViewChild('searchInput', { static: true })
  searchInputRef!: ElementRef<HTMLInputElement>;

  readonly query = signal('');
  readonly loading = signal(false);
  readonly focused = signal(false);
  readonly results = signal<SearchResults | null>(null);

  private searchSubject = new Subject<string>();
  private subscription!: Subscription;
  private keydownHandler = this.onGlobalKeydown.bind(this);

  ngOnInit(): void {
    this.subscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (trimmed.length < 2) {
            this.results.set(null);
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.searchService.search(trimmed).pipe(
            finalize(() => this.loading.set(false)),
          );
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.results.set(res);
        }
      });

    document.addEventListener('keydown', this.keydownHandler);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    document.removeEventListener('keydown', this.keydownHandler);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchSubject.next(value);
  }

  onEscape(): void {
    this.query.set('');
    this.results.set(null);
    this.loading.set(false);
    this.searchInputRef.nativeElement.value = '';
    this.searchInputRef.nativeElement.blur();
  }

  onBlur(): void {
    this.focused.set(false);
  }

  private onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInputRef.nativeElement.focus();
      return;
    }

    if (event.key === '/') {
      const target = event.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const isTextInput =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
      if (!isTextInput) {
        event.preventDefault();
        this.searchInputRef.nativeElement.focus();
      }
    }
  }
}
