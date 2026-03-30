import { validate } from 'class-validator';
import { User } from './user.entity';

function createUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'hanko-user-id-123';
  user.email = 'test@example.com';
  user.name = null;
  Object.assign(user, overrides);
  return user;
}

describe('User entity validation', () => {
  it('should pass validation with valid data', async () => {
    const user = createUser();
    const errors = await validate(user);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with a name set', async () => {
    const user = createUser({ name: 'Alice' });
    const errors = await validate(user);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when id is empty', async () => {
    const user = createUser({ id: '' });
    const errors = await validate(user);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'id')).toBe(true);
  });

  it('should fail validation when email is empty', async () => {
    const user = createUser({ email: '' });
    const errors = await validate(user);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail validation when email is not a valid email', async () => {
    const user = createUser({ email: 'not-an-email' });
    const errors = await validate(user);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });
});
