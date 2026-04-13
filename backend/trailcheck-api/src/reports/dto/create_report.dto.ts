import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateReportDto {
  @IsInt()
  trailId: number;

  @IsInt()
  conditionRating: number;

  @IsString()
  surfaceCondition: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reporterName?: string;
}
