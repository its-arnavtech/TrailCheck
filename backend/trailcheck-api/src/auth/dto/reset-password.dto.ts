import { Transform } from 'class-transformer';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PASSWORD_POLICY_MESSAGE } from './password-policy';

export class ResetPasswordDto {
  @IsString()
  @Transform(({ value }) => String(value ?? '').trim())
  @Length(64, 64)
  @Matches(/^[a-f0-9]+$/i, {
    message: 'Reset token format is invalid.',
  })
  token: string;

  @IsString()
  @MinLength(12, { message: PASSWORD_POLICY_MESSAGE })
  @MaxLength(128, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[a-z]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[A-Z]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[0-9]/, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(/[^A-Za-z0-9]/, { message: PASSWORD_POLICY_MESSAGE })
  password: string;
}
