import { Module } from '@nestjs/common';
import { JsonProtocolAdapter } from './json-protocol-adapter';
import { CommonModule } from '../common/common.module';

export const SCREEN_PROTOCOL_ADAPTER = 'SCREEN_PROTOCOL_ADAPTER';

@Module({
  imports: [CommonModule],
  providers: [
    {
      provide: SCREEN_PROTOCOL_ADAPTER,
      useClass: JsonProtocolAdapter,
    },
  ],
  exports: [SCREEN_PROTOCOL_ADAPTER],
})
export class ScreenProtocolModule {}
