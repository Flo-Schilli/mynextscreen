import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardAlerts } from './dashboard-alerts';
import { DashboardAlert } from './dashboard-summary.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeAlert(overrides: Partial<DashboardAlert> = {}): DashboardAlert {
  return {
    id: 'screen:1',
    tone: 'offline',
    title: 'Lobby offline',
    description: 'No heartbeat since 2 h ago',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('DashboardAlerts', () => {
  let fixture: ComponentFixture<DashboardAlerts>;
  let component: DashboardAlerts;

  async function setup(alerts: DashboardAlert[]): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        DashboardAlerts,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardAlerts);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('alerts', alerts);
    fixture.detectChanges();
  }

  it('renders one row per alert with title and description', async () => {
    await setup([
      makeAlert({ id: 'a', title: 'Lobby offline', description: 'No heartbeat' }),
      makeAlert({
        id: 'b',
        tone: 'warn',
        title: 'Transcoding failed',
        description: '1 item failed',
      }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Lobby offline');
    expect(text).toContain('No heartbeat');
    expect(text).toContain('Transcoding failed');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.alert-item')).toHaveLength(2);
  });

  it('maps tone to the matching colour token', async () => {
    await setup([makeAlert({ tone: 'offline' })]);
    expect(component.color('offline')).toBe('var(--color-offline)');
    expect(component.color('warn')).toBe('var(--color-warn)');
    expect(component.color('info')).toBe('var(--color-info)');
    expect(component.bg('offline')).toBe('var(--offline-dim)');
    expect(component.icon('offline')).toBe('WifiOff');
    expect(component.icon('warn')).toBe('Alert');
    expect(component.icon('info')).toBe('Bell');
  });

  it('formats relative time buckets', async () => {
    await setup([makeAlert()]);
    const now = Date.now();
    expect(component.relativeTime(new Date(now - 10_000).toISOString())).toBe('just now');
    expect(component.relativeTime(new Date(now - 5 * 60_000).toISOString())).toBe('5 min ago');
    expect(component.relativeTime(new Date(now - 3 * 3_600_000).toISOString())).toBe('3 h ago');
    expect(component.relativeTime(new Date(now - 2 * 86_400_000).toISOString())).toBe('2 d ago');
  });

  it('omits the timestamp label when an alert has no timestamp', async () => {
    await setup([makeAlert({ timestamp: null })]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-time')).toBeNull();
  });
});
