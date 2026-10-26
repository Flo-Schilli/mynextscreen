import { generateSealedBoxKeyPair, open, seal } from './sealed-box';

/**
 * Sealed by this module once and pinned here. The dashboard's spec opens the
 * same vector with its own implementation; if either half drifts, one of the
 * two stops passing. The key exists only for this test.
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

describe('sealed box', () => {
  it('round-trips a message to the holder of the private key', async () => {
    const recipient = await generateSealedBoxKeyPair();

    const sealed = await seal(recipient.publicKey, 'secret');

    await expect(open(recipient, sealed)).resolves.toBe('secret');
  });

  it('opens the pinned cross-implementation vector', async () => {
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(VECTOR.privateKeyPkcs8, 'base64'),
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    );

    await expect(open({ publicKey: VECTOR.publicKey, privateKey }, VECTOR.sealed)).resolves.toBe(
      VECTOR.plaintext,
    );
  });

  it('cannot be opened by a different key pair', async () => {
    const recipient = await generateSealedBoxKeyPair();
    const stranger = await generateSealedBoxKeyPair();
    const sealed = await seal(recipient.publicKey, 'secret');

    await expect(open(stranger, sealed)).rejects.toThrow();
  });

  it('rejects a tampered message', async () => {
    const recipient = await generateSealedBoxKeyPair();
    const bytes = Buffer.from(await seal(recipient.publicKey, 'secret'), 'base64');
    bytes[bytes.length - 1] ^= 0x01;

    await expect(open(recipient, bytes.toString('base64'))).rejects.toThrow();
  });

  it('rejects a truncated message', async () => {
    const recipient = await generateSealedBoxKeyPair();

    await expect(open(recipient, Buffer.alloc(40).toString('base64'))).rejects.toThrow('truncated');
  });

  it('refuses a recipient key that is not a P-256 point', async () => {
    await expect(seal(Buffer.alloc(32).toString('base64'), 'secret')).rejects.toThrow(
      'not a P-256 point',
    );
  });
});
