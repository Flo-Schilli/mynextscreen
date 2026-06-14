/**
 * myNextScreen UI primitive library — Phase 1
 *
 * Import from this barrel in feature modules:
 *   import { BtnComponent, CardComponent, IconComponent } from '../ui';
 */

// Icon
export { IconComponent } from './icon.component';
export type { IconName } from './icon.component';

// Atoms
export { StatusDotComponent } from './status-dot.component';
export type { StatusDotStatus } from './status-dot.component';

export { BadgeComponent } from './badge.component';
export type { BadgeTone } from './badge.component';

export { BtnComponent } from './btn.component';
export type { BtnVariant, BtnSize } from './btn.component';

export { CountComponent } from './count.component';

// Layout / containers
export { CardComponent } from './card.component';
export { CardHeadComponent } from './card-head.component';
export { PageHeaderComponent } from './page-header.component';

// Data-viz
export { BarComponent } from './bar.component';
export { RingComponent } from './ring.component';

// Media / avatars
export { AvatarComponent, IdenticonComponent, UserAvatarComponent } from './avatar.component';
export { ThumbComponent } from './thumb.component';

// Empty state
export { EmptyComponent } from './empty.component';

// Forms
export { SelectComponent } from './select.component';
export type { SelectOption } from './select.component';

export { SwitchComponent, ToggleRowComponent } from './switch.component';
export { SInputComponent, SFieldComponent } from './form.component';

// Overlays
export { OverlayComponent, ModalComponent } from './overlay.component';
