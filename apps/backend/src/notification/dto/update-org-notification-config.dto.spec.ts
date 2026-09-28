import 'reflect-metadata';
import { validate } from 'class-validator';
import { UpdateOrgNotificationConfigDto } from './update-org-notification-config.dto';

function createDto(overrides: Partial<UpdateOrgNotificationConfigDto> = {}) {
  const dto = new UpdateOrgNotificationConfigDto();
  Object.assign(dto, overrides);
  return dto;
}

async function failingProperties(dto: UpdateOrgNotificationConfigDto): Promise<string[]> {
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('UpdateOrgNotificationConfigDto', () => {
  describe('ntfyUrl (SSRF)', () => {
    it('accepts a public https endpoint', async () => {
      expect(await failingProperties(createDto({ ntfyUrl: 'https://ntfy.sh' }))).toEqual([]);
    });

    it.each([
      'http://127.0.0.1:6379',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]:8080',
      'http://localhost:3000',
      'file:///etc/passwd',
      'not-a-url',
    ])('rejects %s', async (ntfyUrl) => {
      expect(await failingProperties(createDto({ ntfyUrl }))).toContain('ntfyUrl');
    });

    it('accepts a container hostname — only the resolved address can reveal it', async () => {
      // Syntax alone cannot tell "mynextscreen-postgres" from a public host. The
      // block happens in OutboundGuard right before the request, once DNS has
      // answered; see outbound-url.util.spec.ts.
      expect(
        await failingProperties(createDto({ ntfyUrl: 'http://mynextscreen-postgres:5432' })),
      ).toEqual([]);
    });

    it('treats null as "clear the setting", not as an invalid URL', async () => {
      expect(await failingProperties(createDto({ ntfyUrl: null }))).toEqual([]);
    });
  });

  describe('ntfyTopic (path traversal)', () => {
    it('accepts a plain topic', async () => {
      expect(await failingProperties(createDto({ ntfyTopic: 'mynextscreen-alerts_1' }))).toEqual(
        [],
      );
    });

    it.each(['../../admin', 'a/b', 'topic?x=1', 'with space', 'a'.repeat(65)])(
      'rejects %s',
      async (ntfyTopic) => {
        expect(await failingProperties(createDto({ ntfyTopic }))).toContain('ntfyTopic');
      },
    );
  });

  describe('smtpHost (port scanning)', () => {
    it('accepts a public mail host', async () => {
      expect(await failingProperties(createDto({ smtpHost: 'smtp.example.com' }))).toEqual([]);
    });

    it.each(['127.0.0.1', 'localhost', '10.0.0.5', '169.254.169.254'])(
      'rejects %s',
      async (smtpHost) => {
        expect(await failingProperties(createDto({ smtpHost }))).toContain('smtpHost');
      },
    );
  });

  describe('smtpPort', () => {
    it.each([0, 65536, -1])('rejects the out-of-range port %s', async (smtpPort) => {
      expect(await failingProperties(createDto({ smtpPort }))).toContain('smtpPort');
    });
  });
});
