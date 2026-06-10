import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes a password to a non-plaintext bcrypt string', async () => {
    const hash = await service.hash('s3cret-password');
    expect(hash).not.toBe('s3cret-password');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('correct horse battery staple');
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('right-password');
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('returns false for a null hash (invitee without a password)', async () => {
    await expect(service.verify(null, 'anything')).resolves.toBe(false);
  });

  it('returns false for an undefined hash', async () => {
    await expect(service.verify(undefined, 'anything')).resolves.toBe(false);
  });

  it('never throws on a malformed hash', async () => {
    await expect(service.verify('not-a-bcrypt-hash', 'x')).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const a = await service.hash('same');
    const b = await service.hash('same');
    expect(a).not.toBe(b);
  });
});
