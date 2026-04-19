import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
  userId: number;
  emailFingerprint: string;
};

export type PasswordResetEmailResult =
  | {
      status: 'sent';
      provider: 'resend';
      messageId: string | null;
    }
  | {
      status: 'skipped';
      provider: string;
      reason: 'provider-disabled' | 'missing-config';
    };

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail({
    to,
    resetUrl,
    expiresAt,
    userId,
    emailFingerprint,
  }: PasswordResetEmailInput) {
    const provider =
      this.configService.get<string>('PASSWORD_RESET_EMAIL_PROVIDER') ??
      'disabled';

    if (provider !== 'resend') {
      this.logger.warn(
        `Password reset email send skipped for user ${userId} (fingerprint ${emailFingerprint}): provider "${provider}" is not enabled.`,
      );
      return {
        status: 'skipped',
        provider,
        reason: 'provider-disabled',
      } satisfies PasswordResetEmailResult;
    }

    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim() ?? '';
    const from =
      this.configService.get<string>('MAIL_FROM_ADDRESS')?.trim() ?? '';
    const expiresInMinutes = this.configService.getOrThrow<number>(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES',
    );

    if (!apiKey || !from) {
      this.logger.error(
        `Password reset email send skipped for user ${userId} (fingerprint ${emailFingerprint}): Resend configuration is incomplete.`,
      );
      return {
        status: 'skipped',
        provider,
        reason: 'missing-config',
      } satisfies PasswordResetEmailResult;
    }

    this.logger.log(
      `Attempting Resend password reset delivery for user ${userId} (fingerprint ${emailFingerprint}).`,
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

    let messageId: string | null = null;
    try {
      const body = (await response.json()) as { id?: string };
      messageId = typeof body.id === 'string' ? body.id : null;
    } catch {
      messageId = null;
    }

    this.logger.log(
      `Resend password reset delivery succeeded for user ${userId} (fingerprint ${emailFingerprint})${messageId ? ` with message id ${messageId}` : ''}.`,
    );

    return {
      status: 'sent',
      provider: 'resend',
      messageId,
    } satisfies PasswordResetEmailResult;
  }
}
