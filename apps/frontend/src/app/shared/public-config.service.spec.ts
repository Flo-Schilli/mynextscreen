import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicConfigService } from './public-config.service';

describe('PublicConfigService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with the default player URL and adopts the fetched value', async () => {
    const service = TestBed.inject(PublicConfigService); // constructor fires the load
    expect(service.playerUrl()).toBe('screen.mynextscreen.app');

    httpMock.expectOne('/api/config').flush({ playerUrl: 'https://player.example.com' });
    await new Promise((r) => setTimeout(r));

    expect(service.playerUrl()).toBe('https://player.example.com');
  });

  it('keeps the default when the request fails', async () => {
    const service = TestBed.inject(PublicConfigService);

    httpMock.expectOne('/api/config').flush('nope', { status: 500, statusText: 'Error' });
    await new Promise((r) => setTimeout(r));

    expect(service.playerUrl()).toBe('screen.mynextscreen.app');
  });
});
