import { validate } from 'class-validator';
import { Screen } from './screen.entity';

function createScreen(overrides: Partial<Screen> = {}): Screen {
  const screen = new Screen();
  screen.organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  screen.name = 'Main Stage Screen';
  screen.resolution = '1920x1080';
  screen.location = 'Stage Left';
  screen.apiKeyHash = '$2b$10$somehashvalue';
  screen.isOnline = false;
  screen.lastHeartbeat = null;
  screen.groupId = null;
  screen.gridRow = null;
  screen.gridColumn = null;
  Object.assign(screen, overrides);
  return screen;
}

describe('Screen entity validation', () => {
  it('should pass validation with valid data', async () => {
    const screen = createScreen();
    const errors = await validate(screen);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is empty', async () => {
    const screen = createScreen({ name: '' });
    const errors = await validate(screen);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when resolution is empty', async () => {
    const screen = createScreen({ resolution: '' });
    const errors = await validate(screen);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'resolution')).toBe(true);
  });

  it('should fail validation when location is empty', async () => {
    const screen = createScreen({ location: '' });
    const errors = await validate(screen);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'location')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const screen = createScreen({ organisationId: '' });
    const errors = await validate(screen);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should pass validation with lastHeartbeat as null', async () => {
    const screen = createScreen({ lastHeartbeat: null });
    const errors = await validate(screen);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with isOnline true', async () => {
    const screen = createScreen({ isOnline: true });
    const errors = await validate(screen);
    expect(errors).toHaveLength(0);
  });
});
