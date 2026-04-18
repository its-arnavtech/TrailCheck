import { Transform } from 'class-transformer';
import { IsEmail, MaxLength, Validate } from 'class-validator';
import { AllowedEmailDomainConstraint } from './auth.dto';

export class ForgotPasswordDto {
  @IsEmail()
  @Validate(AllowedEmailDomainConstraint)
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @MaxLength(320)
  email: string;
}
