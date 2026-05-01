import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(80)
  parkSlug: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  @MinLength(2)
  @MaxLength(500)
  question: string;
}
