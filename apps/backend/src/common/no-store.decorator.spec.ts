import { HEADERS_METADATA } from '@nestjs/common/constants';
import { ScreenPairingController } from '../screen/screen-pairing.controller';
import { ScreenController } from '../screen/screen.controller';
import { SiteAgentDeviceController } from '../site-agent/site-agent-device.controller';
import { SiteAgentController } from '../site-agent/site-agent.controller';
import { NoStore } from './no-store.decorator';

type Handler = (...args: never[]) => unknown;

/** Every route whose response body carries a key, token, setup code or passphrase. */
const SECRET_BEARING_HANDLERS: readonly [string, Handler][] = [
  ['ScreenPairingController.start', ScreenPairingController.prototype.start],
  ['ScreenPairingController.status', ScreenPairingController.prototype.status],
  ['ScreenController.createSession', ScreenController.prototype.createSession],
  ['ScreenController.refreshSession', ScreenController.prototype.refreshSession],
  ['SiteAgentController.create', SiteAgentController.prototype.create],
  ['SiteAgentController.reissueEnrolment', SiteAgentController.prototype.reissueEnrolment],
  ['SiteAgentDeviceController.enrol', SiteAgentDeviceController.prototype.enrol],
  ['SiteAgentDeviceController.refreshSession', SiteAgentDeviceController.prototype.refreshSession],
  ['SiteAgentDeviceController.config', SiteAgentDeviceController.prototype.config],
];

function headersOf(handler: Handler): { name: string; value: string }[] {
  return (Reflect.getMetadata(HEADERS_METADATA, handler) ?? []) as {
    name: string;
    value: string;
  }[];
}

class Probe {
  @NoStore()
  handler(): void {
    /* route stub */
  }
}

describe('NoStore', () => {
  it('forbids caching the response anywhere', () => {
    const headers = headersOf(Probe.prototype.handler);

    expect(headers).toEqual(
      expect.arrayContaining([
        { name: 'Cache-Control', value: 'no-store' },
        { name: 'Pragma', value: 'no-cache' },
      ]),
    );
  });

  it.each(SECRET_BEARING_HANDLERS)('is applied to %s', (_name, handler) => {
    expect(headersOf(handler)).toContainEqual({ name: 'Cache-Control', value: 'no-store' });
  });
});
