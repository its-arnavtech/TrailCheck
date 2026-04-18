import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail({
    to,
    resetUrl,
    expiresAt,
  }: PasswordResetEmailInput) {
    const provider = this.configService.get<string>(
      'PASSWORD_RESET_EMAIL_PROVIDER',
    );

    if (provider !== 'resend') {
      this.logger.warn(
        'Password reset email delivery is disabled. Configure PASSWORD_RESET_EMAIL_PROVIDER=resend to enable emails.',
      );
      return;
    }

    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    const from = this.configService.getOrThrow<string>('MAIL_FROM_ADDRESS');
    const expiresInMinutes = this.configService.getOrThrow<number>(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    );

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Reset your TrailCheck password',
        text: [
          'We received a request to reset your TrailCheck password.',
          `Use this link within ${expiresInMinutes} minutes:`,
          resetUrl,
          `This link expires at ${expiresAt.toISOString()}.`,
          'If you did not request this, you can safely ignore this email.',
        ].join('\n\n'),
        html: [
          '<p>We received a request to reset your TrailCheck password.</p>',
          `<p><a href="${resetUrl}">Reset your password</a></p>`,
          `<p>This link expires in ${expiresInMinutes} minutes.</p>`,
          '<p>If you did not request this, you can safely ignore this email.</p>',
        ].join(''),
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(
        `Resend email delivery failed with status ${response.status}: ${message}`,
      );
    }
  }
}
