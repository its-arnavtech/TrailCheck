import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SURFACE_CONDITIONS = ['DRY', 'MUDDY', 'SNOWY', 'ICY'] as const;

export class CreateReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trailId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  conditionRating: number;

  @IsString()
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsIn(SURFACE_CONDITIONS)
  @MaxLength(40)
  surfaceCondition: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @MaxLength(2000)
  @MinLength(1)
  note?: string;
}
