import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AgentMetricsService } from './observability/agent-metrics.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { PlayerAppsService } from './player-apps/player-apps.service';
import { SiteAgentDeviceController } from './site-agent/site-agent-device.controller';
import { SiteAgentEnrolmentService } from './site-agent/site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent/site-agent-session.service';
import { SiteAgentService } from './site-agent/site-agent.service';
import { SiteAgentConfigService } from './site-agent/site-agent-config.service';
import { SiteAgentSseService } from './site-agent/site-agent-sse.service';
import { ScreenRemoteCommandService } from './site-agent/screen-remote-command.service';
import { NdiStreamStatusService } from './site-agent/ndi-stream-status.service';
import { CapturePluginStatusService } from './site-agent/capture-plugin-status.service';
import { CapturePluginAcceptanceService } from './site-agent/capture-plugin-acceptance.service';
import { CapturePluginLicenseTextService } from './site-agent/capture-plugin-license-text.service';
import { CAPTURE_LICENSE_TEXT_MAX_BYTES } from './site-agent/dto';
import { configureApp } from './app-setup';
import { createHash } from 'node:crypto';

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * Boots the real HTTP configuration of `main.ts` (`configureApp`) around real
 * controllers with mocked services. It guards the plumbing no unit spec sees:
 * a path-scoped body parser once made Nest skip its global one, leaving every
 * JSON route with an empty body.
 */
/** The status and parsed JSON body of a request against the running app. */
async function send(
  baseUrl: string,
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: { message?: unknown } }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

describe('configureApp (HTTP plumbing)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const store = jest.fn().mockResolvedValue(undefined);
  const setupFirstSuperAdmin = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [AuthController, SiteAgentDeviceController],
      providers: [
        { provide: AuthService, useValue: { setupFirstSuperAdmin } },
        { provide: UserService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: SiteAgentEnrolmentService, useValue: {} },
        { provide: SiteAgentSessionService, useValue: {} },
        { provide: SiteAgentService, useValue: {} },
        { provide: SiteAgentConfigService, useValue: {} },
        { provide: SiteAgentSseService, useValue: {} },
        { provide: ScreenRemoteCommandService, useValue: {} },
        { provide: PlayerAppsService, useValue: {} },
        { provide: AgentMetricsService, useValue: {} },
        { provide: NdiStreamStatusService, useValue: {} },
        { provide: CapturePluginStatusService, useValue: {} },
        { provide: CapturePluginAcceptanceService, useValue: {} },
        { provide: CapturePluginLicenseTextService, useValue: { store } },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('parses a JSON body on an ordinary route (validation sees the fields)', async () => {
    const response = await send(baseUrl, 'POST', '/api/auth/setup', {
      email: 'not-an-email',
      password: 'long-enough-password',
    });

    expect(response.status).toBe(400);
    // Parsed body: only the email is invalid. An empty body would also list
    // the missing password.
    expect(JSON.stringify(response.body.message)).toContain('email must be an email');
    expect(JSON.stringify(response.body.message)).not.toContain('password');
  });

  it('accepts a valid JSON body on an ordinary route', async () => {
    setupFirstSuperAdmin.mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', isSuperAdmin: true },
      accessToken: { token: 't', expiresAt: new Date(Date.now() + 1000) },
      refreshToken: { token: 'r', expiresAt: new Date(Date.now() + 1000) },
    });

    const response = await send(baseUrl, 'POST', '/api/auth/setup', {
      email: 'a@example.com',
      password: 'long-enough-password',
    });

    expect(response.status).toBe(200);
    expect(setupFirstSuperAdmin).toHaveBeenCalledWith(
      'a@example.com',
      'long-enough-password',
      undefined,
    );
  });

  it('accepts a license text body above the default 100 kB JSON limit', async () => {
    const ndiLicenseText = 'n'.repeat(CAPTURE_LICENSE_TEXT_MAX_BYTES);
    const termsText = 't'.repeat(CAPTURE_LICENSE_TEXT_MAX_BYTES);
    const body = {
      licenseSha256: 'a'.repeat(64),
      ndiLicenseSha256: sha(ndiLicenseText),
      termsSha256: sha(termsText),
      ndiLicenseText,
      termsText,
    };

    const response = await send(
      baseUrl,
      'PUT',
      '/api/agents/me/capture-plugin/license-text',
      body,
      { Authorization: 'Bearer x' },
    );

    expect(response.status).toBe(204);
    expect(store).toHaveBeenCalledWith(expect.objectContaining({ ndiLicenseText, termsText }));
  });

  it('keeps the 100 kB limit on other routes', async () => {
    const response = await send(baseUrl, 'POST', '/api/auth/setup', {
      email: 'a@example.com',
      password: 'x',
      name: 'n'.repeat(200_000),
    });

    expect(response.status).toBe(413);
  });

  it('rejects the large route without a Bearer header before buffering', async () => {
    const response = await send(baseUrl, 'PUT', '/api/agents/me/capture-plugin/license-text', {
      ndiLicenseText: 'x'.repeat(200_000),
    });

    expect(response.status).toBe(401);
  });
});
