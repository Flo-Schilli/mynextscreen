import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { OrgForm, OrganisationFormPayload } from './org-form';
import { Organisation } from './organisation.model';

function makeOrganisation(overrides: Partial<Organisation> = {}): Organisation {
  return {
    id: 'org-1',
    name: 'Acme Venue',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 10 * 1024 * 1024,
    storageTranscodedLimitBytes: 20 * 1024 * 1024,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Type into a field through ngModel and flush view <-> model. ngModel write-back
 * is asynchronous under zoneless change detection, so detect changes then await
 * stability after dispatching the input event.
 */
async function typeInto(
  fixture: ComponentFixture<unknown>,
  selector: string,
  value: string,
): Promise<void> {
  const el: HTMLInputElement = fixture.nativeElement.querySelector(selector);
  el.value = value;
  el.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  await fixture.whenStable();
}

interface OrgFormFields {
  name: string;
  timeZone: string;
  storageOriginalMB: number;
  storageTranscodedMB: number;
}

function fields(component: OrgForm): OrgFormFields {
  return component as unknown as OrgFormFields;
}

describe('OrgForm', () => {
  let fixture: ComponentFixture<OrgForm>;
  let component: OrgForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrgForm],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrgForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('org', null);
    fixture.componentRef.setInput('submitting', false);
    fixture.componentRef.setInput('error', '');
  });

  describe('create mode (org = null)', () => {
    it('renders the "Create Organisation" heading and "Create" submit label', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(fixture.nativeElement.textContent).toContain('Create Organisation');
      const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submit.nativeElement.textContent).toContain('Create');
    });

    it('leaves the field state empty/zero on init', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(fields(component).name).toBe('');
      expect(fields(component).timeZone).toBe('');
      expect(fields(component).storageOriginalMB).toBe(0);
      expect(fields(component).storageTranscodedMB).toBe(0);
    });
  });

  describe('edit mode (org provided)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput(
        'org',
        makeOrganisation({
          name: 'Existing',
          timeZone: 'UTC',
          storageOriginalLimitBytes: 50 * 1024 * 1024,
          storageTranscodedLimitBytes: 100 * 1024 * 1024,
        }),
      );
    });

    it('renders the "Edit Organisation" heading and "Save Changes" submit label', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(fixture.nativeElement.textContent).toContain('Edit Organisation');
      const submit = fixture.debugElement.query(By.css('button[type="submit"]'));
      expect(submit.nativeElement.textContent).toContain('Save Changes');
    });

    it('seeds field state from the org, converting bytes to MB', () => {
      // Act
      fixture.detectChanges();

      // Assert
      expect(fields(component).name).toBe('Existing');
      expect(fields(component).timeZone).toBe('UTC');
      expect(fields(component).storageOriginalMB).toBe(50);
      expect(fields(component).storageTranscodedMB).toBe(100);
    });
  });

  describe('onSubmit validation', () => {
    it('blocks submit and shows a local error when name is empty', () => {
      // Arrange
      const spy = vi.fn();
      component.save.subscribe(spy);
      fixture.detectChanges();
      fields(component).name = '';
      fields(component).timeZone = 'UTC';

      // Act
      component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(spy).not.toHaveBeenCalled();
      expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
        'Name and time zone are required.',
      );
    });

    it('blocks submit when time zone is empty', () => {
      // Arrange
      const spy = vi.fn();
      component.save.subscribe(spy);
      fixture.detectChanges();
      fields(component).name = 'Acme';
      fields(component).timeZone = '';

      // Act
      component.onSubmit();

      // Assert
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits the payload with storage converted from MB to bytes', () => {
      // Arrange
      let payload: OrganisationFormPayload | undefined;
      component.save.subscribe((p) => (payload = p));
      fixture.detectChanges();
      fields(component).name = 'Acme';
      fields(component).timeZone = 'Europe/Vienna';
      fields(component).storageOriginalMB = 5;
      fields(component).storageTranscodedMB = 7;

      // Act
      component.onSubmit();

      // Assert
      expect(payload).toEqual({
        name: 'Acme',
        timeZone: 'Europe/Vienna',
        storageOriginalLimitBytes: 5 * 1024 * 1024,
        storageTranscodedLimitBytes: 7 * 1024 * 1024,
      });
    });

    it('clears a previous local error on a valid submit', () => {
      // Arrange
      fixture.detectChanges();
      component.onSubmit(); // empty -> sets error
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.error'))).not.toBeNull();

      fields(component).name = 'Acme';
      fields(component).timeZone = 'UTC';

      // Act
      component.onSubmit();
      fixture.detectChanges();

      // Assert
      expect(fixture.debugElement.query(By.css('.error'))).toBeNull();
    });
  });

  describe('inputs and outputs', () => {
    it('writes name back through ngModel', async () => {
      // Arrange
      fixture.detectChanges();
      await fixture.whenStable(); // let NgForm register its controls

      // Act
      await typeInto(fixture, '#name', 'Typed Org');

      // Assert
      expect(fields(component).name).toBe('Typed Org');
    });

    it('disables the submit button while submitting', () => {
      // Arrange
      fixture.componentRef.setInput('submitting', true);

      // Act
      fixture.detectChanges();

      // Assert
      expect(
        fixture.debugElement.query(By.css('button[type="submit"]')).nativeElement.disabled,
      ).toBe(true);
    });

    it('renders the parent error when no local error is set', () => {
      // Arrange
      fixture.componentRef.setInput('error', 'Name already taken.');

      // Act
      fixture.detectChanges();

      // Assert
      expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
        'Name already taken.',
      );
    });

    it('emits dismiss when Cancel is clicked', () => {
      // Arrange
      const spy = vi.fn();
      component.dismiss.subscribe(spy);
      fixture.detectChanges();

      // Act
      fixture.debugElement.query(By.css('.btn-secondary')).triggerEventHandler('click', undefined);

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
