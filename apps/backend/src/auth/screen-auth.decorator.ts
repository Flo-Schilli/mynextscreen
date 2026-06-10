import { SetMetadata } from '@nestjs/common';

export const IS_SCREEN_AUTH_KEY = 'isScreenAuth';
export const ScreenAuth = () => SetMetadata(IS_SCREEN_AUTH_KEY, true);
