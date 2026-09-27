import { Module } from '@nestjs/common';
import { OutboundGuard } from './outbound-guard.service';
import { SecretCipher } from './secret-cipher.service';

/** Cross-cutting helpers that are not tied to a single domain. */
@Module({
  providers: [OutboundGuard, SecretCipher],
  exports: [OutboundGuard, SecretCipher],
})
export class CommonModule {}
