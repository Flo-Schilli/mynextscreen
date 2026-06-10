import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { loginGuard } from './login.guard';
import { SetupService } from '../setup/setup.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SETUP_URL_TREE = {} as UrlTree;

function configure(setupNeeded: boolean): {
  createUrlTree: ReturnType<typeof vi.fn>;
  checkStatus: ReturnType<typeof vi.fn>;
} {
  const checkStatus = vi.fn(() => Promise.resolve(setupNeeded));
  const setupStub = { checkStatus } as unknown as SetupService;
  const createUrlTree = vi.fn(() => SETUP_URL_TREE);
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
  const result = await TestBed.runInInjectionContext(() => loginGuard(route, state));
  return result as boolean | UrlTree;
}

describe('loginGuard', () => {
  it('allows the login page when setup is already complete', async () => {
    const { createUrlTree } = configure(false);
    const result = await runGuard();
    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to /setup on a fresh install (no user yet)', async () => {
    const { createUrlTree } = configure(true);
    const result = await runGuard();
    expect(createUrlTree).toHaveBeenCalledWith(['/setup']);
    expect(result).toBe(SETUP_URL_TREE);
  });
});
