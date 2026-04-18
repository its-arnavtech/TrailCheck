import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AuthDto } from './auth.dto';
import { PASSWORD_POLICY_MESSAGE } from './password-policy';

export const SignupGender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;

export type SignupGender = (typeof SignupGender)[keyof typeof SignupGender];

export class SignupDto extends AuthDto {
  @IsString()
  @MinLength(12, { message: PASSWORD_POLICY_MESSAGE })
  @MaxLength(128, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[a-z]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[A-Z]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[0-9]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[^A-Za-z0-9]/, { message: PASSWORD_POLICY_MESSAGE })
  declare password: string;

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
