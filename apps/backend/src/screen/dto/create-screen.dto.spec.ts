import { validate } from 'class-validator';
import { CreateScreenDto } from './create-screen.dto';

function createDto(overrides: Partial<CreateScreenDto> = {}): CreateScreenDto {
  const dto = new CreateScreenDto();
  dto.name = 'Main Stage';
  dto.resolution = '1920x1080';
  dto.location = 'Stage Left';
  dto.pairingCode = '123456';
  Object.assign(dto, overrides);
  return dto;
}

describe('CreateScreenDto', () => {
  it('passes validation for well-formed input', async () => {
    const errors = await validate(createDto());
    expect(errors).toHaveLength(0);
  });

  it('accepts fields exactly at the 200-char limit', async () => {
    const errors = await validate(createDto({ name: 'a'.repeat(200) }));
    expect(errors).toHaveLength(0);
  });

  it.each(['name', 'resolution', 'location'] as const)(
    'rejects %s longer than 200 chars',
    async (field) => {
      const errors = await validate(createDto({ [field]: 'a'.repeat(201) }));
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    },
  );

  it('rejects a pairing code that is not 6 digits', async () => {
    const errors = await validate(createDto({ pairingCode: '12345' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('pairingCode');
  });
});
