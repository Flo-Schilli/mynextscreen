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
  isAuthenticated: () => boolean;
  loadCurrent: ReturnType<typeof vi.fn>;
}

const LOGIN_URL_TREE = {} as UrlTree;

function configure(opts: { authenticatedBefore: boolean; authenticatedAfterLoad?: boolean }): {
  createUrlTree: ReturnType<typeof vi.fn>;
  loadCurrent: ReturnType<typeof vi.fn>;
} {
  let authed = opts.authenticatedBefore;
  const loadCurrent = vi.fn(() => {
    authed = opts.authenticatedAfterLoad ?? authed;
    return Promise.resolve();
  });
  const authStub: AuthStub = { isAuthenticated: () => authed, loadCurrent };
  const createUrlTree = vi.fn(() => LOGIN_URL_TREE);
  const routerStub = { createUrlTree } as unknown as Router;
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: authStub },
      { provide: Router, useValue: routerStub },
    ],
  });
  return { createUrlTree, loadCurrent };
}

async function runGuard(): Promise<boolean | UrlTree> {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
  return result as boolean | UrlTree;
}

describe('authGuard', () => {
  it('allows activation when already authenticated (no profile reload)', async () => {
    const { createUrlTree, loadCurrent } = configure({ authenticatedBefore: true });
    const result = await runGuard();
    expect(result).toBe(true);
    expect(loadCurrent).not.toHaveBeenCalled();
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('loads the current user then allows when the access cookie is valid', async () => {
    const { createUrlTree, loadCurrent } = configure({
      authenticatedBefore: false,
      authenticatedAfterLoad: true,
    });
    const result = await runGuard();
    expect(loadCurrent).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /login when unauthenticated and no valid cookie', async () => {
    const { createUrlTree } = configure({
      authenticatedBefore: false,
      authenticatedAfterLoad: false,
    });
    const result = await runGuard();
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(LOGIN_URL_TREE);
  });
});
