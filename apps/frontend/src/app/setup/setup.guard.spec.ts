import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { setupGuard } from './setup.guard';
import { SetupService } from './setup.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const LOGIN_URL_TREE = {} as UrlTree;

function configure(setupNeeded: boolean): {
  createUrlTree: ReturnType<typeof vi.fn>;
  checkStatus: ReturnType<typeof vi.fn>;
} {
  const checkStatus = vi.fn(() => Promise.resolve(setupNeeded));
  const setupStub = { checkStatus } as unknown as SetupService;
  const createUrlTree = vi.fn(() => LOGIN_URL_TREE);
  const routerStub = { createUrlTree } as unknown as Router;
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: SetupService, useValue: setupStub },
      { provide: Router, useValue: routerStub },
    ],
  });
  return { createUrlTree, checkStatus };
}

async function runGuard(): Promise<boolean | UrlTree> {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  const result = await TestBed.runInInjectionContext(() => setupGuard(route, state));
  return result as boolean | UrlTree;
}

describe('setupGuard', () => {
  it('allows activation when setup is needed', async () => {
    const { createUrlTree } = configure(true);
    const result = await runGuard();
    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /login when setup is already complete', async () => {
    const { createUrlTree } = configure(false);
    const result = await runGuard();
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(LOGIN_URL_TREE);
  });
});
