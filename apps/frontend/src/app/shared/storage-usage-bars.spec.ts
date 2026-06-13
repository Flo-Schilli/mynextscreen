import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { StorageUsageBars } from './storage-usage-bars';
import { UsageBar } from './usage-bar';
import { StorageInfo } from '../content/content.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('StorageUsageBars', () => {
  let fixture: ComponentFixture<StorageUsageBars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageUsageBars],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageUsageBars);
  });

  it('renders an originals and a transcoded usage bar with the storage figures', () => {
    const storage: StorageInfo = {
      originalUsedBytes: 250,
      originalLimitBytes: 1000,
      transcodedUsedBytes: 750,
      transcodedLimitBytes: 1000,
    };
    fixture.componentRef.setInput('storage', storage);
    fixture.detectChanges();

    const bars = fixture.debugElement
      .queryAll(By.directive(UsageBar))
      .map((d) => d.componentInstance as UsageBar);

    expect(bars).toHaveLength(2);
    expect(bars[0].label()).toBe('Originals');
    expect(bars[0].percent()).toBe(25);
    expect(bars[1].label()).toBe('Transcoded');
    expect(bars[1].percent()).toBe(75);
  });
});
