import { Module } from '@nestjs/common';
import { OutboundGuard } from './outbound-guard.service';

/** Cross-cutting helpers that are not tied to a single domain. */
@Module({
  providers: [OutboundGuard],
  exports: [OutboundGuard],
})
export class CommonModule {}
