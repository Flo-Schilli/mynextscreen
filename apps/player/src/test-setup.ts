// The player is zone-based (provideZoneChangeDetection + zone.js), so use the
// Analog zone setup (frontend is zoneless and skips this). This patches zone.js
// + zone.js/testing for Vitest before the TestBed environment is initialised.
import '@analogjs/vitest-angular/setup-zone';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
