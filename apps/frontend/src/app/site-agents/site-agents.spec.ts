import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { SiteAgents } from './site-agents';
import { SiteAgentService } from './site-agent.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import type { CreatedSiteAgent, SiteAgentListItem } from './site-agent.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

class SiteAgentServiceStub {
  getAll(): Observable<SiteAgentListItem[]> {
    return of([]);
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
  siteAgentStatus$ = EMPTY;
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
