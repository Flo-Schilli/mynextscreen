import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { SiteAgents } from './site-agents';
import { SiteAgentService } from './site-agent.service';
import { DashboardSseService, DashboardEvent } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import type { CreatedSiteAgent, SiteAgentListItem } from './site-agent.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const LISTED_AGENT: SiteAgentListItem = {
  id: 'agent-1',
  organisationId: 'org-1',
  name: 'Venue North',
  location: null,
  agentVersion: null,
  lastHeartbeat: null,
  isOnline: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  screenCount: 0,
};

class SiteAgentServiceStub {
  getAll(): Observable<SiteAgentListItem[]> {
    return of([LISTED_AGENT]);
  }

  create(): Observable<CreatedSiteAgent> {
    return of({
      agent: {
        id: 'agent-1',
        organisationId: 'org-1',
        name: 'Venue North',
        location: null,
        agentVersion: null,
        lastHeartbeat: null,
        isOnline: false,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
      enrolmentToken: 'the-setup-code',
      expiresAt: '2026-10-01T10:15:00.000Z',
    });
  }
}

class DashboardSseServiceStub {
  siteAgentStatus$ = new Subject<DashboardEvent>();
}

class ToastServiceStub {
  success = (): void => undefined;
  error = (): void => undefined;
}

describe('SiteAgents', () => {
  let fixture: ComponentFixture<SiteAgents>;
  let component: SiteAgents;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteAgents, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SiteAgentService, useClass: SiteAgentServiceStub },
        { provide: DashboardSseService, useClass: DashboardSseServiceStub },
        { provide: ToastService, useClass: ToastServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteAgents);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // The first heartbeat flips the agent online; "last seen" has to move with it
  // or the card reads "online, never seen" until a reload.
  it('takes the online status and last check-in from the status event', () => {
    const sse = TestBed.inject(DashboardSseService) as unknown as DashboardSseServiceStub;

    sse.siteAgentStatus$.next({
      type: 'site-agent.status',
      data: {
        agentId: 'agent-1',
        name: 'Venue North',
        isOnline: true,
        lastHeartbeat: '2026-10-06T11:04:00.000Z',
      },
      timestamp: '2026-10-06T11:04:00.000Z',
    });

    expect(component['agents']()[0]).toMatchObject({
      isOnline: true,
      lastHeartbeat: '2026-10-06T11:04:00.000Z',
    });
  });

  it('shows the freshly created setup code exactly once', () => {
    component['openCreate']();
    component['newName'].set('Venue North');

    component['create']();
    fixture.detectChanges();

    const panel = fixture.debugElement.query(By.css('[data-testid="setup-code"]'));
    expect(panel).not.toBeNull();
    expect((panel.nativeElement as HTMLElement).textContent).toContain('the-setup-code');
  });

  it('forgets the code once the dialog is closed, so it cannot be shown again', () => {
    component['openCreate']();
    component['newName'].set('Venue North');
    component['create']();
    fixture.detectChanges();

    component['closeCreate']();
    fixture.detectChanges();

    expect(component['issued']()).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="setup-code"]'))).toBeNull();
  });
});
