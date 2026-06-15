import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InstanceDashboard } from './instance-dashboard';
import { InstanceAdminService } from './instance-admin.service';
import { InstanceAdminSummary } from './instance-admin.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeSummary(overrides: Partial<InstanceAdminSummary> = {}): InstanceAdminSummary {
  return {
    users: { total: 3, verified: 2, pending: 1 },
    organisationCount: 2,
    storage: {
      originalUsedBytes: 150,
      originalLimitBytes: 1500,
      transcodedUsedBytes: 270,
      transcodedLimitBytes: 2700,
    },
    hostDisk: { path: './media', totalBytes: 1000, freeBytes: 400, available: true },
    ...overrides,
  };
}

describe('InstanceDashboard', () => {
  let fixture: ComponentFixture<InstanceDashboard>;
  const getSummary = vi.fn();
  const getSystemLoad = vi.fn();

  beforeEach(() => {
    getSummary.mockReset();
    getSystemLoad.mockReset();
    getSystemLoad.mockReturnValue(of({ cpu: [], ram: [], cores: 0, ramTotalGB: 0 }));
  });

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InstanceDashboard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: InstanceAdminService, useValue: { getSummary, getSystemLoad } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceDashboard);
    fixture.detectChanges();
  }

  it('renders user, organisation and storage figures on load', async () => {
    getSummary.mockReturnValue(of(makeSummary()));
    await setup();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('2'); // verified
    expect(text).toContain('Pending');
    expect(fixture.componentInstance.summary()?.organisationCount).toBe(2);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('derives host used bytes as total minus free', async () => {
    getSummary.mockReturnValue(of(makeSummary()));
    await setup();

    expect(fixture.componentInstance.hostUsedBytes()).toBe(600);
  });

  it('shows a fallback message when disk stats are unavailable', async () => {
    getSummary.mockReturnValue(
      of(
        makeSummary({
          hostDisk: { path: './media', totalBytes: 0, freeBytes: 0, available: false },
        }),
      ),
    );
    await setup();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Disk usage unavailable');
  });

  it('surfaces a 403 as an access-denied message', async () => {
    getSummary.mockReturnValue(throwError(() => ({ status: 403 })));
    await setup();

    expect(fixture.componentInstance.loadError()).toContain('Access denied');
  });
});
