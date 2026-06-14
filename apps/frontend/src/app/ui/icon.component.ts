/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'Dashboard'
  | 'Screens'
  | 'Groups'
  | 'Content'
  | 'Playlists'
  | 'Schedules'
  | 'Stream'
  | 'Audit'
  | 'Settings'
  | 'Search'
  | 'Bell'
  | 'Sun'
  | 'Moon'
  | 'Plus'
  | 'PlusCircle'
  | 'Logout'
  | 'Chevron'
  | 'ChevronLeft'
  | 'Check'
  | 'CheckCircle'
  | 'Arrow'
  | 'Wifi'
  | 'WifiOff'
  | 'Play'
  | 'Upload'
  | 'Image'
  | 'Video'
  | 'Alert'
  | 'Clock'
  | 'Storage'
  | 'MapPin'
  | 'Dots'
  | 'Grid'
  | 'List'
  | 'Refresh'
  | 'Filter'
  | 'Cast'
  | 'Sparkle'
  | 'Eye'
  | 'Calendar'
  | 'Layers'
  | 'Power'
  | 'Globe'
  | 'Download'
  | 'Trash'
  | 'Copy'
  | 'Pencil'
  | 'Mail'
  | 'Lock'
  | 'User'
  | 'Building'
  | 'Hash';

/** SVG path data keyed by icon name. All icons share 24×24 viewBox. */
const ICON_PATHS: Record<IconName, string> = {
  Dashboard: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
  Screens: `<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>`,
  Groups: `<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M14 17.2h6M17 14.2v6"/>`,
  Content: `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.7"/><path d="m4 17 4.5-4.2L12 16l3-2.8L20 18"/>`,
  Playlists: `<path d="M4 6h11M4 12h11M4 18h7"/><path d="M17.5 12.5v6.2a1.6 1.6 0 1 1-1.4-1.6"/><path d="M19 12.2v-1.7"/>`,
  Schedules: `<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/><path d="M8.5 14h3M14 14h1.5M8.5 17.3h3"/>`,
  Stream: `<circle cx="12" cy="12" r="2.3"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M5 5a9.5 9.5 0 0 0 0 14M19 19a9.5 9.5 0 0 0 0-14"/>`,
  Audit: `<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>`,
  Settings: `<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>`,
  Search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>`,
  Bell: `<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5Z"/><path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>`,
  Sun: `<circle cx="12" cy="12" r="4.2"/><path d="M12 1.8v2.4M12 19.8v2.4M22.2 12h-2.4M4.2 12H1.8M19 5l-1.7 1.7M6.7 17.3 5 19M19 19l-1.7-1.7M6.7 6.7 5 5"/>`,
  Moon: `<path d="M20.5 14.2A8.4 8.4 0 1 1 9.8 3.5a6.6 6.6 0 0 0 10.7 10.7Z"/>`,
  Plus: `<path d="M12 5v14M5 12h14"/>`,
  PlusCircle: `<circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/>`,
  Logout: `<path d="M15 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H15"/><path d="M10 12h10M16.5 8l3.5 4-3.5 4"/>`,
  Chevron: `<path d="m9 6 6 6-6 6"/>`,
  ChevronLeft: `<path d="m15 6-6 6 6 6"/>`,
  Check: `<path d="m5 12.5 4.5 4.5L19 6.5"/>`,
  CheckCircle: `<circle cx="12" cy="12" r="9"/><path d="m8 12 2.8 2.8L16.2 9.2"/>`,
  Arrow: `<path d="M5 12h14M13 6l6 6-6 6"/>`,
  Wifi: `<path d="M2 8.8a15 15 0 0 1 20 0M5 12.2a10 10 0 0 1 14 0M8.2 15.6a5 5 0 0 1 7.6 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/>`,
  WifiOff: `<path d="M3 3l18 18M8.2 15.6a5 5 0 0 1 6-.8M2 8.8a15 15 0 0 1 6.5-3.6M16 5.5A15 15 0 0 1 22 8.8M19 12.2a10 10 0 0 0-3-1.9"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/>`,
  Play: `<path d="M7 5.2v13.6a.7.7 0 0 0 1.06.6l11-6.8a.7.7 0 0 0 0-1.2l-11-6.8A.7.7 0 0 0 7 5.2Z" fill="currentColor" stroke="none"/>`,
  Upload: `<path d="M4 15.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5"/><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/>`,
  Image: `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 4.5-4.2L12 16l3-2.8L20 18"/>`,
  Video: `<rect x="2.5" y="5" width="14" height="14" rx="2"/><path d="m16.5 9.5 5-3v11l-5-3"/>`,
  Alert: `<path d="M12 3.5 1.8 20.5h20.4L12 3.5Z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.6" r="0.9" fill="currentColor" stroke="none"/>`,
  Clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>`,
  Storage: `<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3"/>`,
  MapPin: `<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>`,
  Dots: `<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>`,
  Grid: `<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>`,
  List: `<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>`,
  Refresh: `<path d="M20 11.5A8 8 0 1 0 18 17"/><path d="M20 5v6h-6"/>`,
  Filter: `<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>`,
  Cast: `<path d="M3 16.5a4.5 4.5 0 0 1 4.5 4.5M3 12a9 9 0 0 1 9 9M3 7.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5"/><circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none"/>`,
  Sparkle: `<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>`,
  Eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
  Calendar: `<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>`,
  Layers: `<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 16.5l9 5 9-5"/>`,
  Power: `<path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/>`,
  Globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/>`,
  Download: `<path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/>`,
  Trash: `<path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/>`,
  Copy: `<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>`,
  Pencil: `<path d="M4 20h4L18.5 9.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/><path d="M13.5 6.5l4 4"/>`,
  Mail: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/>`,
  Lock: `<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none"/>`,
  User: `<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>`,
  Building: `<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>`,
  Hash: `<path d="M9 3 7 21M17 3l-2 18M4 8.5h16M3.5 15.5h16"/>`,
};

/**
 * Inline SVG icon component. Renders a single 24×24 stroke icon from the
 * myNextScreen icon set. Inherits `currentColor` so it follows the parent's
 * text color. Replace SafeHtmlPipe + SVG-string pattern with this component.
 *
 * @example
 * <mns-icon name="Settings" [size]="20" />
 */
@Component({
  selector: 'mns-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      [innerHTML]="paths()"
    ></svg>
  `,
  host: {
    style: 'display:contents',
  },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(20);
  readonly strokeWidth = input<number>(1.7);

  readonly paths = computed(() => ICON_PATHS[this.name()] ?? '');
}
