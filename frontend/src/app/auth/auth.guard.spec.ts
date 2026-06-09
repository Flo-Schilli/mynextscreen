import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  isValid: () => Promise<boolean>;
}

const LOGIN_URL_TREE = {} as UrlTree;

function configure(isValid: boolean): { createUrlTree: ReturnType<typeof vi.fn> } {
  const authStub: AuthStub = { isValid: () => Promise.resolve(isValid) };
  const createUrlTree = vi.fn(() => LOGIN_URL_TREE);
  const routerStub = { createUrlTree } as unknown as Router;
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: authStub },
      { provide: Router, useValue: routerStub },
    ],
  });
  return { createUrlTree };
}

async function runGuard(): Promise<boolean | UrlTree> {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  // authGuard is an async CanActivateFn that always resolves to boolean | UrlTree
  // (never an Observable), so narrowing the awaited GuardResult is safe here.
  const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
  return result as boolean | UrlTree;
}

describe('authGuard', () => {
  it('allows activation by returning true when the session is valid', async () => {
    // Arrange
    const { createUrlTree } = configure(true);

    // Act
    const result = await runGuard();

    // Assert
    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /login when the session is invalid', async () => {
    // Arrange
    const { createUrlTree } = configure(false);

    // Act
    const result = await runGuard();

    // Assert
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(LOGIN_URL_TREE);
  });
});
