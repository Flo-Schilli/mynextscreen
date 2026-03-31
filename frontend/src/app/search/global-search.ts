import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { SearchService } from './search.service';
import { SearchResults, SearchResultItem } from './search.model';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of, finalize, filter } from 'rxjs';

interface ResultSection {
  key: keyof SearchResults;
  heading: string;
  items: SearchResultItem[];
}

@Component({
  selector: 'app-global-search',
  template: `
    <div class="search-wrapper">
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
          (keydown.escape)="onEscape()"
          (keydown.arrowDown)="onArrowDown($event)"
          (keydown.arrowUp)="onArrowUp($event)"
          (keydown.enter)="onEnter($event)"
        />
        <kbd class="shortcut-hint" [class.hidden]="focused()">Ctrl+K</kbd>
      </div>

      @if (dropdownOpen()) {
        <div class="dropdown">
          @if (hasResults()) {
            @for (section of sections(); track section.key) {
              <div class="dropdown-section">
                <div class="section-heading">{{ section.heading }}</div>
                @for (item of section.items; track item.id) {
                  <button
                    class="result-item"
                    [class.active]="activeIndex() === flatIndex(section.key, $index)"
                    (mousedown)="navigateTo(item)"
                    (mouseenter)="activeIndex.set(flatIndex(section.key, $index))"
                  >
                    <span class="result-label">{{ item.label }}</span>
                  </button>
                }
              </div>
            }
          } @else {
            <div class="empty-state">No results found</div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .search-wrapper {
      position: relative;
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

    /* ── Dropdown ── */
    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      min-width: 280px;
      max-height: 400px;
      overflow-y: auto;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 8px 24px var(--color-shadow);
      z-index: 100;
      padding: 0.25rem 0;
    }

    .dropdown-section {
      padding: 0.25rem 0;
    }
    .dropdown-section + .dropdown-section {
      border-top: 1px solid var(--color-border);
    }

    .section-heading {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      padding: 0.375rem 0.75rem 0.25rem;
    }

    .result-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      color: var(--color-text-primary);
      font-size: 0.8125rem;
      cursor: pointer;
      line-height: 1.4;
    }
    .result-item:hover,
    .result-item.active {
      background: var(--color-bg-tertiary);
    }

    .result-label {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-state {
      padding: 1rem 0.75rem;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }
  `,
})
export class GlobalSearch implements OnInit, OnDestroy {
  private searchService = inject(SearchService);
  private router = inject(Router);

  @ViewChild('searchInput', { static: true })
  searchInputRef!: ElementRef<HTMLInputElement>;

  readonly query = signal('');
  readonly loading = signal(false);
  readonly focused = signal(false);
  readonly results = signal<SearchResults | null>(null);
  readonly activeIndex = signal(-1);

  private static readonly SECTION_ORDER: { key: keyof SearchResults; heading: string }[] = [
    { key: 'screens', heading: 'Screens' },
    { key: 'content', heading: 'Content' },
    { key: 'playlists', heading: 'Playlists' },
    { key: 'schedules', heading: 'Schedules' },
  ];

  readonly sections = computed<ResultSection[]>(() => {
    const res = this.results();
    if (!res) return [];
    return GlobalSearch.SECTION_ORDER
      .filter((s) => res[s.key].length > 0)
      .map((s) => ({ ...s, items: res[s.key] }));
  });

  readonly hasResults = computed(() => this.sections().length > 0);

  readonly dropdownOpen = computed(
    () => this.results() !== null && this.focused(),
  );

  private flatItems = computed<SearchResultItem[]>(() =>
    this.sections().flatMap((s) => s.items),
  );

  private searchSubject = new Subject<string>();
  private subscription!: Subscription;
  private routeSub!: Subscription;
  private keydownHandler = this.onGlobalKeydown.bind(this);
  private clickOutsideHandler = this.onClickOutside.bind(this);

  ngOnInit(): void {
    this.subscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
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
          this.activeIndex.set(-1);
        }
      });

    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => this.closeDropdown());

    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('mousedown', this.clickOutsideHandler);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.routeSub?.unsubscribe();
    document.removeEventListener('keydown', this.keydownHandler);
    document.removeEventListener('mousedown', this.clickOutsideHandler);
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
    this.activeIndex.set(-1);
    this.searchInputRef.nativeElement.value = '';
    this.searchInputRef.nativeElement.blur();
  }

  onArrowDown(event: Event): void {
    event.preventDefault();
    const items = this.flatItems();
    if (items.length === 0) return;
    const next = this.activeIndex() + 1;
    this.activeIndex.set(next >= items.length ? 0 : next);
  }

  onArrowUp(event: Event): void {
    event.preventDefault();
    const items = this.flatItems();
    if (items.length === 0) return;
    const prev = this.activeIndex() - 1;
    this.activeIndex.set(prev < 0 ? items.length - 1 : prev);
  }

  onEnter(event: Event): void {
    const items = this.flatItems();
    const idx = this.activeIndex();
    if (idx >= 0 && idx < items.length) {
      event.preventDefault();
      this.navigateTo(items[idx]);
    }
  }

  navigateTo(item: SearchResultItem): void {
    this.closeDropdown();
    this.router.navigateByUrl(item.url);
  }

  flatIndex(sectionKey: keyof SearchResults, itemIndex: number): number {
    const secs = this.sections();
    let offset = 0;
    for (const sec of secs) {
      if (sec.key === sectionKey) return offset + itemIndex;
      offset += sec.items.length;
    }
    return -1;
  }

  private closeDropdown(): void {
    this.query.set('');
    this.results.set(null);
    this.loading.set(false);
    this.activeIndex.set(-1);
    this.searchInputRef.nativeElement.value = '';
    this.searchInputRef.nativeElement.blur();
  }

  private onClickOutside(event: MouseEvent): void {
    const el = this.searchInputRef.nativeElement.closest('.search-wrapper');
    if (el && !el.contains(event.target as Node)) {
      this.focused.set(false);
    }
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
