import { describe, expect, it } from 'vitest';
import { fromBase64, generateSealedBoxKeyPair, open, seal } from './sealed-box';

/**
 * Sealed by the site agent's implementation and pinned in its spec as well
 * (`apps/site-agent/src/backup/sealed-box.spec.ts`). Opening it here proves the
 * browser half derives the same key from the same bytes. Test-only key.
 */
const VECTOR = {
  publicKey:
    'BO+1DpNBgAQL4s7Jd2StlCsIxG9gPT5EOTIJ0+2FyW0fl93W+xpMCgPTylvpkz3A8YP47ymy+wU38nqJcVeCLsw=',
  privateKeyPkcs8:
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgN4pEu/DTMoByUUkdsY7R66Q8mu4zoI4PXi7ElSus/DKhRANCAATvtQ6TQYAEC+LOyXdkrZQrCMRvYD0+RDkyCdPthcltH5fd1vsaTAoD08pb6ZM9wPGD+O8psvsFN/J6iXFXgi7M',
  sealed:
    'BJVS8NYiFQ0tQSTy5KKtIGPS5/p67DTPROafVs9tt6hlILNWH+PMvl6o5/t0pqpxjl1+pN/YnAZzChoFlIsQMICMGRsibvXA8Nj65OBaD1f/XUTgrBwPwAtDW8pm5hbXq0zLwRRW0kRWXa6oRc5p22XhVhR9FdVXqn0=',
  plaintext: 'K7QM-2XRA-9PDF-T4HN-WB6C-ZJ3E',
};

describe('sealed box (browser)', () => {
  it('opens the vector the site agent sealed', async () => {
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      fromBase64(VECTOR.privateKeyPkcs8),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    );

    await expect(open({ publicKey: VECTOR.publicKey, privateKey }, VECTOR.sealed)).resolves.toBe(
      VECTOR.plaintext,
    );
  });

  it('round-trips a message', async () => {
    const recipient = await generateSealedBoxKeyPair();

    await expect(open(recipient, await seal(recipient.publicKey, 'secret'))).resolves.toBe(
      'secret',
    );
  });

  it('cannot be opened with another key pair', async () => {
    const recipient = await generateSealedBoxKeyPair();
    const stranger = await generateSealedBoxKeyPair();

    await expect(open(stranger, await seal(recipient.publicKey, 'secret'))).rejects.toThrow();
  });

  it('rejects a truncated message and a malformed key', async () => {
    const recipient = await generateSealedBoxKeyPair();

    await expect(open(recipient, btoa('short'))).rejects.toThrow('truncated');
    await expect(seal(btoa('not a point'), 'x')).rejects.toThrow('not a P-256 point');
  });
});
