# Feature 015: Global Search

## Introduction

Provide a global search input in the top bar that lets users quickly find screens, content, playlists, and schedules within their organisation by typing a query. Results appear in a categorised dropdown; clicking a result navigates to the entity's detail page.

### Architecture Context

- **Vision alignment:** The top bar explicitly includes a global search component; searching across screens, content, and playlists is called out in the vision. Schedules are added as a fourth entity per product decision.
- **Components involved:** `SearchModule` (new backend module), top-bar `GlobalSearch` component (new frontend component), existing entity repositories (Screen, Content, Playlist, ScheduleEntry)
- **Multi-tenancy:** Every search query is scoped by `organisationId` — users can only find entities that belong to their own organisation
- **Database:** SQLite3 with TypeORM; search is implemented with `LIKE`-based queries initially (see Design Considerations for FTS5 tradeoff)

## Goals

- Users can search for screens, content, playlists, and schedules from anywhere in the app via a persistent top-bar input
- Results are categorised by entity type and returned in a single API response
- Clicking a result navigates directly to the entity's detail page
- The search input is keyboard-accessible (Ctrl+K or `/` to focus)
- All queries are scoped to the current organisation

## Tasks

### TASK-015-001: SearchModule Backend Service
**Description:** As the system, I want a SearchService that queries all four entity types and returns categorised, org-scoped results so that a single API call satisfies the global search use case.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-015-002
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [ ] `SearchModule` created under `backend/src/search/`
- [ ] `SearchService` with a single `search(query: string, organisationId: string): Promise<SearchResultsDto>` method
- [ ] Searches across four entity types:
  - **Screen:** matches on `name`, `location`
  - **Content:** matches on `title`, `description`, `tags`
  - **Playlist:** matches on `name`
  - **ScheduleEntry:** matches on the linked playlist's `name` and the linked screen/group's `name`
- [ ] Each entity is queried with case-insensitive `LIKE '%query%'` via TypeORM `QueryBuilder`; all queries include `WHERE organisationId = :orgId`
- [ ] Results capped per category: maximum 5 results per entity type (20 total)
- [ ] Return type `SearchResultsDto` contains four arrays: `screens`, `content`, `playlists`, `schedules`; each item has at minimum `id`, `type`, `label` (display text), and `url` (frontend navigation path)
- [ ] Empty query string returns empty results immediately without hitting the database
- [ ] Unit tests covering: normal match, no results, empty query, org-scoping (results from another org are excluded)
- [ ] Typecheck and lint pass

### TASK-015-002: Search REST API Endpoint
**Description:** As a frontend developer, I want a `GET /api/search` endpoint so that the frontend can retrieve search results with a single request.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-015-001
**Successors:** TASK-015-003, TASK-015-004
**Parallel:** no

**Acceptance Criteria:**
- [ ] `SearchController` with route `GET /api/search?q=<query>`
- [ ] Query param `q` is required; returns HTTP 400 if missing
- [ ] Minimum query length: 2 characters; returns HTTP 400 with a clear message if shorter (prevents overly broad queries)
- [ ] Controller extracts `organisationId` from the authenticated user's JWT and passes it to `SearchService`
- [ ] Route is protected by the existing JWT auth guard; unauthenticated requests return HTTP 401
- [ ] Response shape:
  ```json
  {
    "screens":   [{ "id": "...", "type": "screen",   "label": "...", "url": "/screens/..." }],
    "content":   [{ "id": "...", "type": "content",  "label": "...", "url": "/content/..." }],
    "playlists": [{ "id": "...", "type": "playlist", "label": "...", "url": "/playlists/..." }],
    "schedules": [{ "id": "...", "type": "schedule", "label": "...", "url": "/schedules/..." }]
  }
  ```
- [ ] Unit tests for: happy path, missing `q`, short `q`, unauthenticated
- [ ] Typecheck and lint pass

### TASK-015-003: Frontend — Global Search Input in Top Bar
**Description:** As a user, I want a search input in the top bar so that I can start a search from anywhere in the app.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-015-002
**Successors:** TASK-015-004
**Parallel:** yes — can run alongside nothing once 002 is done (UI shell can be built before wiring results)

**Acceptance Criteria:**
- [ ] `GlobalSearch` component added to the top bar, visually consistent with the existing dark theme
- [ ] Input placeholder: "Search…" with a search icon on the left
- [ ] Keyboard shortcut: pressing `Ctrl+K` or `/` (when focus is not already in a text input) focuses the search input
- [ ] Pressing `Escape` clears the input and closes the results dropdown
- [ ] Input is debounced (300 ms) before triggering an API call to avoid request spam
- [ ] API call is only made when the trimmed query is at least 2 characters
- [ ] Loading state shows a spinner inside the input while the request is in flight
- [ ] Typecheck and lint pass

### TASK-015-004: Frontend — Search Results Dropdown
**Description:** As a user, I want to see categorised search results in a dropdown so that I can quickly identify and navigate to the entity I am looking for.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-015-002, TASK-015-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [ ] Results dropdown appears below the search input when results are available
- [ ] Results are grouped into sections with headings: "Screens", "Content", "Playlists", "Schedules"
- [ ] Sections with zero results are hidden entirely
- [ ] Each result item displays the entity's `label`; a subtle secondary line may show additional context (e.g. screen location, content type) if available
- [ ] Clicking a result item navigates to the entity's `url` and closes the dropdown
- [ ] Keyboard navigation: `ArrowDown` / `ArrowUp` moves focus between items; `Enter` activates the focused item
- [ ] "No results found" empty state is shown when all four arrays are empty
- [ ] Clicking outside the dropdown closes it
- [ ] Dropdown is dismissed when navigation occurs (route change)
- [ ] Typecheck and lint pass

## Task Dependency Graph

```
TASK-015-001 ──→ TASK-015-002 ──→ TASK-015-003 ──→ TASK-015-004
                      │                                  ↑
                      └──────────────────────────────────┘
```

| Task | Estimate | Predecessors | Parallel | Notes |
|------|----------|--------------|----------|-------|
| TASK-015-001 | ~25k | none | — | Backend service, start here |
| TASK-015-002 | ~15k | 001 | no | REST endpoint, unblocks frontend |
| TASK-015-003 | ~20k | 002 | yes (with 004 shell) | Input component |
| TASK-015-004 | ~25k | 002, 003 | no | Results dropdown |

**Total estimated tokens:** ~85k

## Functional Requirements

- FR-1: A search input is present in the top bar on all authenticated pages
- FR-2: Searches are scoped to the current user's organisation; results from other organisations are never returned
- FR-3: Four entity types are searched: screens, content, playlists, and schedules
- FR-4: Results are categorised by entity type in the response and in the UI
- FR-5: Up to 5 results are returned per category (20 total maximum)
- FR-6: Clicking a result navigates to the entity's detail page
- FR-7: The search input can be focused via keyboard shortcut (Ctrl+K or /)
- FR-8: Queries shorter than 2 characters do not trigger a search

## Non-Goals

- No full-text search ranking or relevance scoring (all matches are treated equally)
- No search history or saved searches
- No pagination of search results (max 5 per category is sufficient for a quick-find feature)
- No search within entity detail pages (e.g. searching within a playlist's items)
- No fuzzy/typo-tolerant matching
- No FTS5 virtual tables in this iteration (LIKE-based search is sufficient for the expected data volume; see Design Considerations)

## Design Considerations

**LIKE vs FTS5:**
SQLite supports FTS5 full-text search via virtual tables, which would offer tokenised matching and ranking. However, for the expected scale of this application (hundreds to low thousands of entities per organisation), `LIKE '%query%'` queries with indexed `organisationId` are fast enough and require no schema migration complexity. FTS5 remains an option for a future performance optimisation if needed. This decision should be revisited if search latency becomes noticeable.

**Result cap per category:**
Returning at most 5 results per category keeps the dropdown focused and avoids overwhelming the user. The goal of global search is quick navigation to a known entity, not exhaustive listing.

**URL construction:**
The `url` field in each search result is constructed by the backend service using well-known frontend route patterns (e.g. `/screens/:id`, `/content/:id`). This avoids coupling the frontend result renderer to entity-type-specific routing logic.

**Debounce:**
A 300 ms debounce on the frontend input prevents a request on every keystroke. The 2-character minimum further reduces unnecessary traffic.

## Technical Considerations

- `SearchService` uses TypeORM `Repository.createQueryBuilder()` with `.where('entity.organisationId = :orgId', { orgId })` and `.andWhere('LOWER(entity.field) LIKE LOWER(:q)', { q: \`%${query}%\` })` — always scope by org first
- For `ScheduleEntry`, a JOIN to the linked playlist and screen is required to surface a useful `label`; use the playlist name as the primary label
- The four queries in `SearchService.search()` are fired in parallel with `Promise.all()` to minimise latency
- The search endpoint should not be rate-limited more aggressively than other API endpoints; the debounce on the frontend is sufficient protection
- Ensure the `q` parameter is sanitised before interpolation into the LIKE pattern — strip or escape `%` and `_` characters that would otherwise act as wildcards in SQL LIKE expressions

## Success Metrics

- A user can type a query in the top bar and navigate to a result within 2 interactions (type, click)
- Search response time is under 300 ms for typical query and org data size
- All four entity types appear in results when matching entities exist

## Open Questions

- **Schedule label:** ScheduleEntry has no standalone name. The current plan uses the linked playlist's name as the label. Should the screen or screen group name also be shown as secondary context? — Recommend yes, shown as secondary text in the result item; implementation detail left to TASK-015-004.
- **Tag search format:** Content tags may be stored as a JSON array or comma-separated string. The exact LIKE query for tags depends on the storage format — confirm before implementing TASK-015-001.
