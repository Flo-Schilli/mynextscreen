import { isDisallowedCameraHost } from './camera-host.validator';

describe('isDisallowedCameraHost', () => {
  it.each([
    '127.0.0.1',
    '127.5.5.5',
    '0.0.0.0',
    '169.254.169.254',
    '224.0.0.251',
    '239.255.255.250',
    '::',
    '::1',
    'fe80::1',
    'febf::1',
    'ff02::fb',
    '::ffff:127.0.0.1',
    '::ffff:169.254.1.1',
  ])('rejects %s', (host) => {
    expect(isDisallowedCameraHost(host)).toBe(true);
  });

  it.each(['192.168.1.50', '10.0.0.7', '172.16.4.2', '8.8.8.8', '2001:db8::5', '::ffff:10.0.0.1'])(
    'allows %s',
    (host) => {
      expect(isDisallowedCameraHost(host)).toBe(false);
    },
  );

  it('leaves non-IP input to @IsIP', () => {
    expect(isDisallowedCameraHost('camera.local')).toBe(false);
  });
});
