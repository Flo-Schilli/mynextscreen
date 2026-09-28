import { Module } from '@nestjs/common';
import { OutboundGuard } from './outbound-guard.service';
import { SecretCipher } from './secret-cipher.service';
import { MediaUrlSigner } from './media-url-signer.service';

/** Cross-cutting helpers that are not tied to a single domain. */
@Module({
  providers: [OutboundGuard, SecretCipher, MediaUrlSigner],
  exports: [OutboundGuard, SecretCipher, MediaUrlSigner],
})
export class CommonModule {}
