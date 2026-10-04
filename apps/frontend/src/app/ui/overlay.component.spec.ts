import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent, OverlayComponent } from './overlay.component';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

@Component({
  standalone: true,
  imports: [OverlayComponent, ModalComponent],
  template: `
    @if (outer()) {
      <mns-overlay (closed)="outer.set(false)">
        <mns-modal title="Outer" (closed)="outer.set(false)">
          <input id="field" />
          @if (inner()) {
            <mns-overlay (closed)="inner.set(false)">
              <mns-modal title="Inner" (closed)="inner.set(false)">Inner body</mns-modal>
            </mns-overlay>
          }
        </mns-modal>
      </mns-overlay>
    }
  `,
})
class HostComponent {
  readonly outer = signal(true);
  readonly inner = signal(false);
}

describe('OverlayComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const pressEscape = (target: EventTarget = document): void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('closes on Escape even though nothing inside it has focus', () => {
    // The backdrop is never focused when a dialog opens, so an Escape lands on
    // <body> — it has to be caught on the document or it is lost.
    pressEscape();

    expect(host.outer()).toBe(false);
  });

  it('closes on Escape pressed inside a field', () => {
    // Regression guard: the panel used to swallow every keydown.
    const field = fixture.nativeElement.querySelector('#field') as HTMLElement;
    pressEscape(field);

    expect(host.outer()).toBe(false);
  });

  it('closes only the innermost dialog', () => {
    host.inner.set(true);
    fixture.detectChanges();

    pressEscape();

    expect(host.inner()).toBe(false);
    expect(host.outer()).toBe(true);
  });

  it('answers Escape again once the innermost dialog is gone', () => {
    host.inner.set(true);
    fixture.detectChanges();
    pressEscape();
    pressEscape();

    expect(host.outer()).toBe(false);
  });

  it('does not close when a click lands inside the panel', () => {
    const field = fixture.nativeElement.querySelector('#field') as HTMLElement;
    field.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(host.outer()).toBe(true);
  });

  it('closes on a click on the backdrop itself', () => {
    const backdrop = fixture.nativeElement.querySelector('[role=dialog]') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(host.outer()).toBe(false);
  });
});
