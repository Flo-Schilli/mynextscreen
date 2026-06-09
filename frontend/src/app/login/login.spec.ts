import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../auth/auth.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

type SessionUser = { is_valid: boolean } | null;

interface AuthStub {
  currentUser$: BehaviorSubject<SessionUser>;
}

function setup(initialUser: SessionUser): {
  fixture: ComponentFixture<Login>;
  userSubject: BehaviorSubject<SessionUser>;
  navigate: ReturnType<typeof vi.fn>;
} {
  const userSubject = new BehaviorSubject<SessionUser>(initialUser);
  const authStub: AuthStub = { currentUser$: userSubject };
  const navigate = vi.fn(() => Promise.resolve(true));
  const routerStub = { navigate } as unknown as Router;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: authStub },
      { provide: Router, useValue: routerStub },
    ],
  });

  const fixture = TestBed.createComponent(Login);
  return { fixture, userSubject, navigate };
}

describe('Login', () => {
  it('renders the hanko-auth custom element and title', () => {
    // Arrange
    const { fixture } = setup(null);

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.debugElement.query(By.css('hanko-auth'))).not.toBeNull();
    const title = fixture.debugElement.query(By.css('.login-title'));
    expect(title.nativeElement.textContent).toContain('Signage Server');
  });

  it('does not navigate while no user session exists', () => {
    // Arrange
    const { fixture, navigate } = setup(null);

    // Act
    fixture.detectChanges();

    // Assert
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects to the root route when a session already exists on init', () => {
    // Arrange
    const { fixture, navigate } = setup({ is_valid: true });

    // Act
    fixture.detectChanges();

    // Assert
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('redirects to the root route when a session becomes available after init', () => {
    // Arrange
    const { fixture, userSubject, navigate } = setup(null);
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();

    // Act
    userSubject.next({ is_valid: true });

    // Assert
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('unsubscribes from the session stream on destroy', () => {
    // Arrange
    const { fixture, userSubject, navigate } = setup(null);
    fixture.detectChanges();

    // Act
    fixture.destroy();
    userSubject.next({ is_valid: true });

    // Assert: no navigation after teardown
    expect(navigate).not.toHaveBeenCalled();
  });
});
