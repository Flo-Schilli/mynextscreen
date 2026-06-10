import { Module } from '@nestjs/common';
import { JsonProtocolAdapter } from './json-protocol-adapter';

export const SCREEN_PROTOCOL_ADAPTER = 'SCREEN_PROTOCOL_ADAPTER';

@Module({
  providers: [
    {
      provide: SCREEN_PROTOCOL_ADAPTER,
      useClass: JsonProtocolAdapter,
    },
  ],
  exports: [SCREEN_PROTOCOL_ADAPTER],
})
export class ScreenProtocolModule {}
