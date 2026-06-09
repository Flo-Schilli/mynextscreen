import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { App } from './app';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
  });

  it('creates the root component', () => {
    // Assert
    expect(fixture.componentInstance).toBeInstanceOf(App);
  });

  it('renders a router-outlet', () => {
    // Act
    fixture.detectChanges();

    // Assert
    const outlet = fixture.debugElement.query(By.css('router-outlet'));
    expect(outlet).not.toBeNull();
  });
});
