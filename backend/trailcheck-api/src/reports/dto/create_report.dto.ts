import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReportDto {
  @Type(() => Number)
  @IsInt()
  trailId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  conditionRating: number;

  @IsString()
  @MaxLength(40)
  surfaceCondition: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
