import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create_report.dto';

describe('CreateReportDto', () => {
  async function validateInput(input: Record<string, unknown>) {
    const dto = plainToInstance(CreateReportDto, input);
    const errors = await validate(dto);
    return { dto, errors };
  }

  it('accepts a report when the optional note is omitted', async () => {
    const { dto, errors } = await validateInput({
      trailId: 4,
      conditionRating: 3,
      surfaceCondition: 'dry',
    });

    expect(errors).toHaveLength(0);
    expect(dto.note).toBeUndefined();
    expect(dto.surfaceCondition).toBe('DRY');
    expect(dto.trailId).toBe(4);
  });

  it('treats a blank note as omitted', async () => {
    const { dto, errors } = await validateInput({
      trailId: 4,
      conditionRating: 5,
      surfaceCondition: 'MUDDY',
      note: '   ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.note).toBeUndefined();
  });

  it('keeps a real note', async () => {
    const { dto, errors } = await validateInput({
      trailId: 4,
      conditionRating: 2,
      surfaceCondition: 'icy',
      note: '  Ice on the switchbacks. ',
    });

    expect(errors).toHaveLength(0);
    expect(dto.note).toBe('Ice on the switchbacks.');
  });
});
