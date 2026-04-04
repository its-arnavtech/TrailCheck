import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { Gender } from '@prisma/client';
import { AuthDto } from './auth.dto';

export class SignupDto extends AuthDto {
  @IsEnum(Gender)
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  gender: Gender;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;
}
