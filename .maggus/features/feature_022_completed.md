# Feature 022: Dark Theme Visual Separation Improvement

## Introduction

The current dark theme uses a narrow range of blue-slate shades (`#0f172a`, `#1e293b`, `#334155`) with borders sharing the same color as hover states. This makes it nearly impossible to distinguish cards from the page background, sidebar from content, and individual panels from each other. The result is a flat, muddy interface where all areas blend together.

This feature redesigns the dark theme's color token hierarchy to create clear visual layers through increased background contrast, stronger borders, and subtle elevation shadows — while keeping the existing blue-slate palette.

### Architecture Context

- **Vision alignment:** "Dark mode first — optimised for control-room and backstage environments" — improving readability directly supports this goal
- **Components involved:** Primarily `styles.css` (theme tokens), `layout.ts` (sidebar/topbar), and all components using card/panel patterns
- **No new components or patterns** — this is a refinement of existing CSS custom properties and inline styles

## Goals

- Create a clear 4-layer visual depth hierarchy in dark mode (page → sidebar → cards → elevated elements)
- Make sidebar visually distinct from the main content area
- Ensure cards, panels, and list items are clearly separated from their backgrounds
- Maintain the blue-slate color family
- Preserve full light mode parity (no regressions)

## Tasks

### TASK-022-001: Redesign Dark Theme Tokens
**Description:** As a developer, I want to update the dark mode CSS custom properties in `styles.css` so that the background layers, borders, and new elevation tokens create proper visual separation.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-022-002, TASK-022-003
**Parallel:** no — all other tasks depend on these tokens

**Acceptance Criteria:**
- [x] `--color-bg-primary` (page) is darkened for more contrast against surfaces
- [x] `--color-bg-secondary` (cards/panels) has clear visible contrast against `--color-bg-primary`
- [x] `--color-bg-tertiary` (hover/badges) is distinct from `--color-border`
- [x] `--color-border` is updated to be visually distinct from surface colors
- [x] New `--color-shadow` token added for dark mode elevation effects
- [x] New `--color-bg-sidebar` token added for distinct sidebar background
- [x] Light mode tokens remain unchanged (no regressions)
- [x] All existing Tailwind utility usages of these tokens continue to work
- [x] Typecheck/lint passes

### TASK-022-002: Update Sidebar and Topbar Styling
**Description:** As a user, I want the sidebar to be visually distinct from the main content area so that navigation and content are clearly separated regions.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-022-001
**Successors:** TASK-022-004
**Parallel:** yes — can run alongside TASK-022-003

**Acceptance Criteria:**
- [x] Sidebar uses `--color-bg-sidebar` (noticeably darker than content cards)
- [x] Sidebar right border is clearly visible against both sidebar and content backgrounds
- [x] Topbar has a subtle bottom shadow or stronger border to separate it from content below
- [x] Collapse/expand button remains visible and accessible
- [x] Nav items, active states, and hover states still have clear contrast against the new sidebar background
- [x] Light mode sidebar appearance is unchanged
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser using dev-browser skill — no dev-browser skill available in current environment

### TASK-022-003: Add Elevation Shadows to Cards and Panels
**Description:** As a user, I want cards and panels to have subtle elevation shadows so that they visually lift off the page background and are clearly distinguishable as separate areas.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-022-001
**Successors:** TASK-022-004
**Parallel:** yes — can run alongside TASK-022-002

**Acceptance Criteria:**
- [x] Dashboard cards have a subtle box-shadow using `--color-shadow`
- [x] Content library grid items have visible elevation
- [x] Playlist cards/list items are clearly separated from each other
- [x] Screen list/grid items have visible separation
- [x] Notification dropdown panel has elevation shadow
- [x] Bulk action toolbar is visually distinct from content below it
- [x] Table headers are distinguishable from table body rows
- [x] Shadows are subtle (not jarring) — complement the border improvements, don't overpower
- [x] Light mode is unchanged (shadows already work well or are not needed)
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser using dev-browser skill — no dev-browser skill available in current environment

### TASK-022-004: Visual QA and Consistency Pass
**Description:** As a user, I want a consistent dark theme experience across all pages so that no component is missed or looks inconsistent with the updated theme.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-022-002, TASK-022-003
**Successors:** none
**Parallel:** no — final verification after all changes

**Acceptance Criteria:**
- [x] Login page renders correctly with new tokens
- [x] Dashboard page: all cards, status grid, storage bars, activity feed are visually distinct
- [x] Screens page: list/grid items, detail view, register form have proper separation
- [x] Content library: grid items, upload area, detail view are distinct
- [x] Playlists page: playlist cards, editor, drag-and-drop items are distinguishable
- [x] Settings pages: form sections and panels are separated
- [x] Modal/dialog overlays (if any) render correctly against new backgrounds
- [x] No text contrast issues (check muted text against new backgrounds)
- [x] Theme toggle between dark and light mode works without visual glitches
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser using dev-browser skill — no dev-browser skill available in current environment

## Task Dependency Graph

```
TASK-022-001 ──→ TASK-022-002 ──→ TASK-022-004
             ──→ TASK-022-003 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-022-001 | ~30k | none | no | — |
| TASK-022-002 | ~25k | 001 | yes (with 003) | — |
| TASK-022-003 | ~40k | 001 | yes (with 002) | — |
| TASK-022-004 | ~20k | 002, 003 | no | — |

**Total estimated tokens:** ~115k

## Functional Requirements

- FR-1: Dark mode must have at least 4 visually distinguishable background layers: page, sidebar, cards, and elevated/hover elements
- FR-2: Sidebar must use a distinct background color from content cards
- FR-3: Cards and panels must have both border and shadow-based separation from the page
- FR-4: Borders must not share the same color as any surface background
- FR-5: All text (primary, secondary, muted) must maintain WCAG AA contrast ratios against their respective new backgrounds
- FR-6: Light mode must remain visually unchanged
- FR-7: Theme toggle must work without page reload or visual glitches

## Non-Goals (Out of Scope)

- No changes to the light mode color palette
- No new theme variants (e.g. AMOLED dark, high contrast)
- No changes to accent colors, status colors (green/red/amber), or semantic colors
- No component layout or spacing changes — only colors and shadows
- No changes to the theme toggle mechanism or theme service logic

## Design Considerations

- The blue-slate palette offers good range — `#020617` (slate-950) through `#475569` (slate-600) provides enough stops for clear layering
- Shadows in dark mode should use near-black with low opacity (e.g. `rgba(0, 0, 0, 0.3)`) rather than colored shadows
- The sidebar being darker than cards creates a natural "frame" effect that guides the eye to the content area

## Technical Considerations

- All changes are CSS-only — no TypeScript logic changes expected
- The centralized `@theme` block in `styles.css` means most of the fix is in one file
- Component-level shadow additions will touch inline styles in multiple `.ts` component files
- No ARCHITECTURE.md update needed — this is a visual refinement, not a structural change

## Success Metrics

- Sidebar, topbar, cards, and page background are distinguishable at a glance without squinting
- Dark mode visual clarity matches or approaches light mode clarity
- No user complaints about "flat" or "muddy" dark theme appearance

## Open Questions

*None — all questions resolved.*
