import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupModeToggle } from './screen-group-mode-toggle';
import { ScreenGroupMode } from './screen-group.model';

describe('ScreenGroupModeToggle', () => {
  let fixture: ComponentFixture<ScreenGroupModeToggle>;
  let component: ScreenGroupModeToggle;

  async function setUp(value: ScreenGroupMode = 'mirror'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupModeToggle],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupModeToggle);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders both mode cards', async () => {
    await setUp();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Mirror');
    expect(fixture.nativeElement.textContent).toContain('Split');
  });

  it('emits the chosen mode on click', async () => {
    await setUp('mirror');
    let emitted: ScreenGroupMode | undefined;
    component.modeChange.subscribe((m) => (emitted = m));

    // Second card is Split.
    fixture.nativeElement.querySelectorAll('button')[1].click();

    expect(emitted).toBe('split');
  });
});
