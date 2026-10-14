import { IsIn, Matches } from 'class-validator';
import { SLIDE_BACKGROUNDS, type SlideBackground } from '../content-source.types';

export class SlideStyleDto {
  @IsIn(SLIDE_BACKGROUNDS)
  background!: SlideBackground;

  /** `#rrggbb`; it ends up in SVG markup, so nothing else is accepted. */
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'accentColor must be a #rrggbb colour' })
  accentColor!: string;
}
