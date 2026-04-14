import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { AuthDto } from './auth.dto';

export const SignupGender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;

export type SignupGender = (typeof SignupGender)[keyof typeof SignupGender];

export class SignupDto extends AuthDto {
  @IsEnum(SignupGender)
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  gender: SignupGender;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;
}
