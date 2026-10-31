import { HEADERS_METADATA } from '@nestjs/common/constants';
import { NoStore } from './no-store.decorator';

class Probe {
  @NoStore()
  handler(): void {
    /* route stub */
  }
}

describe('NoStore', () => {
  it('forbids caching the response anywhere', () => {
    const headers = Reflect.getMetadata(HEADERS_METADATA, Probe.prototype.handler) as {
      name: string;
      value: string;
    }[];

    expect(headers).toEqual(
      expect.arrayContaining([
        { name: 'Cache-Control', value: 'no-store' },
        { name: 'Pragma', value: 'no-cache' },
      ]),
    );
  });
});
