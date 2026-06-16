# Component Catalog — myNextScreen primitives

Source: `reference/components.jsx` (+ `dashboard_widgets.jsx`, `settings.jsx`,
`audit.jsx`, `admin.jsx`). Build each as a **standalone Angular component**
(`ChangeDetectionStrategy.OnPush`, signal `input()`s). Class strings below are
Tailwind 4 utilities resolving the tokens in `tailwind-theme.css`.

Naming suggestion: prefix with `mns-` (e.g. `<mns-card>`, `<mns-btn>`).

---

## StatusDot
Pulsing status indicator.
- `input` `status: 'online'|'warning'|'offline'|'info'` (default online), `pulse?`, `size=8`.
- Dot = `size`×`size` circle, `bg` = status colour, `box-shadow: 0 0 0 3px <dim>`.
- `pulse && status!=='offline'` → `animation: pulseDot 1.8s ease-in-out infinite`.

## Badge
Pill label.
- `input` `tone: 'neutral'|'accent'|'online'|'warning'|'offline'|'info'`, `soft=true`, `icon?`.
- `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold`.
- Colour map: neutral `text-muted`/`surface-3`; accent `text-accent`/`accent-soft`;
  status tones use the colour + its `*-dim` bg.

## Btn
- `input` `variant: 'primary'|'soft'|'outline'|'ghost'|'danger'` (default primary),
  `size:'sm'|'md'|'lg'` (default md), `icon?`, `iconRight?`, `full?`, `title?`, `disabled?`.
- Base: `inline-flex items-center justify-center font-semibold rounded-[10px] leading-none whitespace-nowrap`.
- Sizes: sm `px-3 py-[7px] text-[13px] gap-[7px]`; md `px-4 py-2.5 text-sm gap-2`;
  lg `px-[22px] py-[13px] text-[15px] gap-[9px]`.
- Variants:
  - primary: `linear-gradient(135deg,var(--accent),var(--accent-2))` bg, white text,
    `shadow:0 8px 20px -10px var(--accent-ring)`.
  - soft: `bg-accent-soft text-accent`.
  - outline: transparent, `border border-strong`, `text`.
  - ghost: transparent, `text-muted`.
  - danger: `bg-offline-dim text-offline`.
- Hover: `translateY(-1px)` + `brightness(1.06)`.

## Card
- `input` `pad=true`, `hover?`, `clickable?`, `animate?`, `delay=0`.
- `bg-surface border border-border rounded-lg`, pad → `p-[var(--card-pad)]`,
  `shadow`. Hover variant on hover: `-translate-y-0.5`, `shadow-lg`, `border-strong`.
- `animate` → `fadeUp .5s cubic-bezier(.22,.61,.36,1) {delay}s both` — but ensure
  the resting state is visible (see README animation note).

## CardHead
Header row inside a card.
- `input` `title`, `sub?`, `right?` (slot), `icon?` (slot).
- Layout: `flex items-start justify-between gap-3 mb-[18px]`. Optional icon tile
  34×34 `rounded-[9px] bg-accent-soft text-accent grid place-items-center`. Title
  16/700, sub 13 `text-muted`.

## Bar
Horizontal progress.
- `input` `value` (0–100), `color='var(--accent)'`, `track='var(--track)'`, `h=8`, `glow?`.
- Track `rounded-[99px] overflow-hidden`; fill width `value%`, `bg=color`,
  `glow` → `box-shadow:0 0 12px -2px <color>`, `transition: width .8s cubic-bezier(.22,.61,.36,1)`.

## Ring
SVG donut gauge.
- `input` `value` (0–100), `size=64`, `sw=7`, `color`, `track`, content slot (center).
- Two circles, rotate `-90deg`; progress `stroke-dasharray=2πr`,
  `stroke-dashoffset` animates over `.9s`. Center holds a `<ng-content>` (e.g. "18%").

## Avatar / Identicon / UserAvatar
- **Avatar**: gradient initials tile. `input` `name`, `grad?`, `size=34`. `rounded-[10px]`,
  white text, weight 700, font-size `size*0.36`.
- **Identicon**: deterministic 5×5 symmetric SVG from a string hash → stable hue.
  `input` `seed`, `size=38`, `radius=10`.
- **UserAvatar**: `gravatar` → Identicon(seed=email||name) else Avatar(initials).

## Thumb
Gradient "screen" thumbnail.
- `input` `bg` (gradient), `orient`, `type?` ('video' shows a play glyph), `h`,
  `radius=10`, `badge?`, `dim?` (offline → grayscale+dark). Subtle top sheen overlay.

## Empty
Empty-state block: 56×56 `rounded-2xl bg-surface-3 text-faint` icon tile, title 15/700,
desc 13 `text-muted` (max-w 320), optional action. Centered.

## Count
Animated count-up number. `input` `to`, `dur=900`, `suffix?`. Ease-out cubic via rAF.
In Angular use `effect()` + `requestAnimationFrame`, or a signal updated on a timer.

---

## Composite widgets

### Stat (dashboard KPI) — `dashboard_widgets.jsx`
Card with: label (13/600 `text-muted`) + 34×34 tinted icon tile; big `Count` number
(34/700 mono); footer sub text + `Sparkline`.
- `input` `label`, `value`, `suffix?`, `sub`, `tone`, `icon`, `spark:number[]`, `delay`.

### Sparkline
Tiny inline area+line SVG (w≈76, h≈26) with a vertical gradient fill under the line.

### StatTile (instance-admin KPI) — `admin.jsx`
Like Stat but supports a custom body slot (used for the dual Verified/Pending readout).

### ScreenTile
Screen card: `Thumb` + status chip (blurred dark pill, top-left) + resolution chip
(top-right) + name/location/now-playing footer.

### Select (custom dropdown) — `audit.jsx` / `settings.jsx`
Button (label + chevron, focus ring `0 0 0 3px var(--accent-soft)`) → popover list
(`bg-surface border-strong rounded-md shadow-lg`), selected item `bg-accent-soft text-accent`
+ check. Build as a signal-driven component; close on outside click / `Esc`.

### Switch / ToggleRow / SInput / SField (settings forms)
- Switch: 42×24 pill, knob 18×18 slides; on = `bg-accent`.
- ToggleRow: icon tile + label/desc + Switch.
- SInput: input wrapper with focus ring + optional leading icon + suffix; `mono` opt.
- SField: label (12.5/600 `text-muted`) + control + optional hint (11.5 `text-faint`).

### Overlay / Modal — `modals.jsx`
Fixed full-screen `rgba(4,6,11,.55)` + `backdrop-blur(6px)`, centered, max-w 520,
content `bg-surface border-strong rounded-xl shadow-lg`, header (icon tile + title +
close ✕), body. Close on backdrop click / `Esc`. Content `fadeUp .3s`.

### Toast / ToastHost
Bottom-right stack (`fixed bottom-6 right-6 gap-2.5`), each `bg-surface border-strong
rounded-[13px] shadow-lg`, tone-coloured icon + title + optional desc, auto-dismiss ~3.4s.

### LoadGraph (instance-admin system load) — `admin.jsx`
Single SVG `viewBox 0 0 1000 240`, `width:100% height:auto` (uniform scale — keeps
strokes/dots/text undistorted). Gridlines 0/25/50/75/100 (dashed except baseline) +
0/50/100% y-labels; shaded `accent-soft` transcode-window rects; CPU = solid accent
line + gradient area; RAM = dashed `info` line on top; current-value end dots; x-ticks.
Inputs: `cpu[]`, `ram[]` (0–100, oldest→newest), `transcodeWindows: [start,end][]`,
`cores`, `ramTotalGB`, current/peak values (see `admin_data.jsx › LOAD`).
