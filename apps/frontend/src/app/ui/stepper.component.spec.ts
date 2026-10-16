import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StepperComponent } from './stepper.component';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

describe('StepperComponent', () => {
  let fixture: ComponentFixture<StepperComponent>;
  let component: StepperComponent;

  async function setUp(value = 2, min = 1, max = 4): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        StepperComponent,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(StepperComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Columns');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('min', min);
    fixture.componentRef.setInput('max', max);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  it('renders the label and current value', async () => {
    await setUp(3);
    expect(fixture.nativeElement.textContent).toContain('Columns');
    expect(fixture.nativeElement.textContent).toContain('3');
  });

  it('increments up to the max', async () => {
    await setUp(2, 1, 4);
    component.inc();
    expect(component.value()).toBe(3);
  });

  it('decrements down to the min', async () => {
    await setUp(2, 1, 4);
    component.dec();
    expect(component.value()).toBe(1);
  });

  it('clamps at the min and disables the decrement button', async () => {
    await setUp(1, 1, 4);
    component.dec();
    expect(component.value()).toBe(1);
    expect(buttons()[0].disabled).toBe(true);
  });

  it('clamps at the max and disables the increment button', async () => {
    await setUp(4, 1, 4);
    component.inc();
    expect(component.value()).toBe(4);
    expect(buttons()[1].disabled).toBe(true);
  });

  it('moves by step and clamps the last step to the bounds', async () => {
    await setUp(10, 5, 22);
    fixture.componentRef.setInput('step', 5);
    component.inc();
    expect(component.value()).toBe(15);
    component.inc();
    expect(component.value()).toBe(20);
    component.inc();
    expect(component.value()).toBe(22);
    component.dec();
    component.dec();
    component.dec();
    component.dec();
    expect(component.value()).toBe(5);
  });

  it('snaps a value off the step grid onto it', async () => {
    await setUp(31, 1, 200);
    fixture.componentRef.setInput('step', 5);
    component.dec();
    expect(component.value()).toBe(30);
    component.value.set(31);
    component.inc();
    expect(component.value()).toBe(35);
  });

  it('snaps down to the min when the grid lies below it', async () => {
    await setUp(5, 1, 200);
    fixture.componentRef.setInput('step', 5);
    component.dec();
    expect(component.value()).toBe(1);
    component.inc();
    expect(component.value()).toBe(5);
  });
});
