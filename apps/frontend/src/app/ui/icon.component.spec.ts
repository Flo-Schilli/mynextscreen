import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

@Component({
  standalone: true,
  imports: [IconComponent],
  template: `<mns-icon name="Settings" [size]="20" />`,
})
class HostComponent {}

describe('IconComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders an svg sized from the size input', () => {
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('20');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
  });

  it('renders the icon path children (not stripped by the sanitizer)', () => {
    // Regression guard: SVG fragments are bound as SafeHtml so Angular does not
    // strip the <path>/<circle> children — without that, the svg renders empty.
    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.children.length).toBeGreaterThan(0);
    expect(svg.querySelector('circle, path, rect')).toBeTruthy();
  });
});
