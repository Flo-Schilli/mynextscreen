# Design Tokens — myNextScreen

All values transcribed from `reference/styles.css` (+ admin amber from `reference/admin.jsx`).
Drop-in Tailwind 4 mapping: `tailwind-theme.css`.

## Typography
| Token | Value |
|---|---|
| `--font-sans` | `"Hanken Grotesk", system-ui, -apple-system, sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` |

Weights used: 400/500/600/700/800 (sans), 400/500/600 (mono).
`.mono` enables tabular numerals (`font-feature-settings:"tnum" 1`) — use on every
metric/number/ID readout.

**Type scale observed** (px / weight / tracking):
| Use | Size | Weight | Notes |
|---|---|---|---|
| Page title (H1) | 27 | 800 | `letter-spacing:-0.025em` |
| Card title | 16 | 700 | `-0.01em` |
| KPI number | 34 | 700 | mono, `-0.02em`, line-height 1 |
| Big readout | 26 | 700 | mono (system-load) |
| Body | 14 / 14.5 | 400–600 | |
| Label / meta | 12.5–13.5 | 600 | `text-muted` |
| Overline | 10.5 | 700 | `letter-spacing:.07em; text-transform:uppercase; text-faint` |
| Mono small | 11–13 | 600 | timestamps, IDs, sizes |

## Radii
| Token | px | Tailwind |
|---|---|---|
| `--r-sm` | 8 | `rounded-sm` |
| `--r-md` | 12 | `rounded-md` |
| `--r-lg` | 16 | `rounded-lg` (default card) |
| `--r-xl` | 22 | `rounded-xl` (modals) |
Pills use `rounded-[99px]`. Buttons `rounded-[10px]`. Nav items `rounded-[11px]`.

## Status colors (theme-independent)
| Token | Hex | Dim bg (14%) |
|---|---|---|
| online | `#2ecc71` | `rgb(46 204 113 / .14)` |
| warn | `#f5a623` | `rgb(245 166 35 / .14)` |
| offline | `#ef4757` | `rgb(239 71 87 / .14)` |
| info | `#3b9dff` | `rgb(59 157 255 / .14)` |

## Accent palettes (`[data-accent]`, default `indigo`)
| Accent | `--accent` | `--accent-2` | soft (14%) | ring (35%) |
|---|---|---|---|---|
| indigo | `#6d6cf6` | `#a855f7` | `rgb(109 108 246 / .14)` | `rgb(109 108 246 / .35)` |
| teal | `#14b8a6` | `#22d3ee` | `rgb(20 184 166 / .14)` | `rgb(20 184 166 / .35)` |
| amber | `#f59e0b` | `#f97316` | `rgb(245 158 11 / .14)` | `rgb(245 158 11 / .35)` |
| blue | `#3b82f6` | `#60a5fa` | `rgb(59 130 246 / .14)` | `rgb(59 130 246 / .35)` |

Primary button / logo / active accents use `linear-gradient(135deg, var(--accent), var(--accent-2))`.

## Elevated (Instance Admin) accent — amber
| Token | Value |
|---|---|
| elevated | `#f5a623` |
| elevated-2 | `#f97316` |
| elevated gradient | `linear-gradient(135deg,#f5a623,#f97316)` |
| elevated-soft | `rgb(245 166 35 / .16)` |
Used ONLY for instance-admin chrome (sidebar active item, header icon tile, topbar
identity chip, "Superuser" badges). Content tabs/cards keep the normal accent.

## Surfaces / text / borders
### Dark (default)
| Token | Value |
|---|---|
| bg | `#080b12` |
| bg-grad | `radial-gradient(1200px 700px at 78% -10%, rgb(109 108 246 / .10), transparent 60%), #080b12` |
| rail (sidebar) | `#0b0f18` |
| surface | `#10151f` |
| surface-2 | `#161d2b` |
| surface-3 | `#1d2636` |
| hover | `rgb(255 255 255 / .04)` |
| border | `rgb(255 255 255 / .07)` |
| border-strong | `rgb(255 255 255 / .13)` |
| text | `#eef2f8` |
| text-muted | `#97a1b4` |
| text-faint | `#5d6680` |
| track | `rgb(255 255 255 / .07)` |
| shadow | `0 18px 40px -24px rgb(0 0 0 / .8)` |
| shadow-lg | `0 30px 70px -30px rgb(0 0 0 / .85)` |

### Light
| Token | Value |
|---|---|
| bg | `#eef1f7` |
| rail / surface | `#ffffff` |
| surface-2 | `#f5f7fc` |
| surface-3 | `#eceff7` |
| hover | `rgb(15 23 42 / .035)` |
| border | `rgb(15 23 42 / .09)` |
| border-strong | `rgb(15 23 42 / .16)` |
| text | `#131a27` |
| text-muted | `#5a6577` |
| text-faint | `#93a0b3` |
| track | `rgb(15 23 42 / .08)` |
| shadow | `0 16px 36px -22px rgb(20 30 55 / .28)` |
| shadow-lg | `0 30px 64px -28px rgb(20 30 55 / .34)` |

## Spacing & density (`[data-density]`, default `regular`)
| Density | `--gap` | `--card-pad` |
|---|---|---|
| compact | 14px | 16px |
| regular | 20px | 22px |
| comfy | 26px | 28px |
Grids and stacks space with `gap: var(--gap)`; cards pad with `var(--card-pad)`.
Other recurring spacings: section gaps 18–24px, inline gaps 8–16px, chip padding 4×10.

## Shadows
- Card rest: `--shadow`. Card hover / popovers / modals: `--shadow-lg`.

## Transitions / easing
- Standard ease: `cubic-bezier(.22,.61,.36,1)`.
- Common: `transition: background .18s, border-color .18s, color .18s, transform .18s, box-shadow .18s`.
- Sidebar width `.22s cubic-bezier(.22,.61,.36,1)`. Bar fill `.8s`. Ring `.9s`.

## Keyframes
`fadeUp` (opacity 0 + translateY(10px) → end), `fadeIn`, `pulseDot` (1.8s status dot),
`ringPulse` (1.2s success), `spin` (.8s), plus stream-monitor effects
(`streamSweep/streamScan/vuBar`) in `styles.css`. Gate entrances so the visible
state is the default (don't strand content at opacity:0).
