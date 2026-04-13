import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

const allowedEmailDomains = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
];

@ValidatorConstraint({ name: 'allowedEmailDomain', async: false })
class AllowedEmailDomainConstraint implements ValidatorConstraintInterface {
  validate(email: string) {
    const domain =
      String(email ?? '')
        .trim()
        .toLowerCase()
        .split('@')[1] ?? '';
    return allowedEmailDomains.includes(domain);
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Please use a supported email provider such as Gmail, Yahoo, Outlook, iCloud, AOL, or Proton.';
  }
}

export class AuthDto {
  @IsEmail()
  @Validate(AllowedEmailDomainConstraint)
  @Transform(({ value }) => value.trim().toLowerCase())
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
