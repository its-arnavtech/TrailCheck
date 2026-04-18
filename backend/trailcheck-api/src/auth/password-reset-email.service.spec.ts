import { PasswordResetEmailService } from './password-reset-email.service';

describe('PasswordResetEmailService', () => {
  let service: PasswordResetEmailService;
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'PASSWORD_RESET_EMAIL_PROVIDER':
            return 'resend';
          case 'RESEND_API_KEY':
            return 're_test_123';
          case 'MAIL_FROM_ADDRESS':
            return 'noreply@trailcheck.app';
          default:
            return undefined;
        }
      }),
      getOrThrow: jest.fn((key: string) => {
        switch (key) {
          case 'PASSWORD_RESET_TOKEN_TTL_MINUTES':
            return 30;
          default:
            throw new Error(`Unexpected config lookup: ${key}`);
        }
      }),
    };

    service = new PasswordResetEmailService(configService as never);
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (service as never).logger = logger;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('skips email delivery when the provider is disabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'PASSWORD_RESET_EMAIL_PROVIDER') {
        return 'disabled';
      }
      return undefined;
    });

    const result = await service.sendPasswordResetEmail({
      to: 'existing@gmail.com',
      resetUrl: 'https://trailcheck.app/auth/reset-password?token=abc',
      expiresAt: new Date('2026-04-18T12:00:00.000Z'),
      userId: 7,
      emailFingerprint: 'f1d0a0b8e5ad',
    });

    expect(result).toEqual({
      status: 'skipped',
      provider: 'disabled',
      reason: 'provider-disabled',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('provider "disabled" is not enabled'),
    );
  });

  it('skips email delivery when resend configuration is incomplete', async () => {
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'PASSWORD_RESET_EMAIL_PROVIDER':
          return 'resend';
        case 'RESEND_API_KEY':
          return '';
        case 'MAIL_FROM_ADDRESS':
          return '';
        default:
          return undefined;
      }
    });

    const result = await service.sendPasswordResetEmail({
      to: 'existing@gmail.com',
      resetUrl: 'https://trailcheck.app/auth/reset-password?token=abc',
      expiresAt: new Date('2026-04-18T12:00:00.000Z'),
      userId: 7,
      emailFingerprint: 'f1d0a0b8e5ad',
    });

    expect(result).toEqual({
      status: 'skipped',
      provider: 'resend',
      reason: 'missing-config',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Resend configuration is incomplete'),
    );
  });

  it('calls Resend and returns the message id on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'email_123' }),
    });

    const result = await service.sendPasswordResetEmail({
      to: 'existing@gmail.com',
      resetUrl: 'https://trailcheck.app/auth/reset-password?token=abc',
      expiresAt: new Date('2026-04-18T12:00:00.000Z'),
      userId: 7,
      emailFingerprint: 'f1d0a0b8e5ad',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_123',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(result).toEqual({
      status: 'sent',
      provider: 'resend',
      messageId: 'email_123',
    });
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Attempting Resend password reset delivery for user 7'),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Resend password reset delivery succeeded for user 7'),
    );
  });
});
