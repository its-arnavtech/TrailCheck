import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PasswordResetEmailService } from './password-reset-email.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    requireConnection: jest.Mock;
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwt: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };
  let passwordResetEmailService: {
    sendPasswordResetEmail: jest.Mock;
  };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      requireConnection: jest.fn(),
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        switch (key) {
          case 'JWT_SECRET':
            return 'x'.repeat(32);
          case 'PASSWORD_RESET_TOKEN_TTL_MINUTES':
            return 30;
          case 'FRONTEND_BASE_URL':
            return 'https://trailcheck.app';
          case 'PASSWORD_RESET_MIN_RESPONSE_MS':
            return 0;
          default:
            throw new Error(`Unexpected config lookup: ${key}`);
        }
      }),
    };
    passwordResetEmailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue({
        status: 'sent',
        provider: 'resend',
        messageId: 'email_123',
      }),
    };

    service = new AuthService(
      prisma as never,
      jwt as never,
      configService as never,
      passwordResetEmailService as PasswordResetEmailService,
    );

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (service as never).logger = logger;
  });

  it('returns auth data for valid sign in credentials', async () => {
    const passwordHash = await argon2.hash('Password123!');
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      email: 'hiker@gmail.com',
      password: passwordHash,
      passwordVersion: 0,
    });

    const response = await service.signin({
      email: 'hiker@gmail.com',
      password: 'Password123!',
    });

    expect(response).toEqual({
      access_token: 'signed-jwt',
      user: {
        id: 42,
        email: 'hiker@gmail.com',
        passwordVersion: 0,
      },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 42, email: 'hiker@gmail.com', passwordVersion: 0 },
      expect.any(Object),
    );
  });

  it('rejects invalid sign in credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.signin({
        email: 'missing@gmail.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a forbidden error when password verification hits a malformed hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      email: 'hiker@gmail.com',
      password: 'not-a-valid-argon2-hash',
      passwordVersion: 0,
    });

    await expect(
      service.signin({
        email: 'hiker@gmail.com',
        password: 'Password123!',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the same forgot-password response for an existing account and stores only a token hash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'existing@gmail.com',
    });
    prisma.user.update.mockResolvedValue(undefined);

    const response = await service.forgotPassword({
      email: 'existing@gmail.com',
    });

    expect(response).toEqual({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);

    const updatePayload = prisma.user.update.mock.calls[0][0];
    const resetUrl = passwordResetEmailService.sendPasswordResetEmail.mock.calls[0][0]
      .resetUrl as string;
    const emailPayload = passwordResetEmailService.sendPasswordResetEmail.mock.calls[0][0];
    const token = new URL(resetUrl).searchParams.get('token');

    expect(token).toMatch(/^[a-f0-9]{64}$/i);
    expect(updatePayload.data.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/i);
    expect(updatePayload.data.resetPasswordTokenHash).not.toBe(token);
    expect(updatePayload.data.resetPasswordExpiresAt).toBeInstanceOf(Date);
    expect(emailPayload.userId).toBe(7);
    expect(emailPayload.emailFingerprint).toMatch(/^[a-f0-9]{12}$/i);
    expect(
      prisma.user.update.mock.invocationCallOrder[0],
    ).toBeLessThan(
      passwordResetEmailService.sendPasswordResetEmail.mock.invocationCallOrder[0],
    );
  });

  it('returns the same forgot-password response for a non-existing account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const response = await service.forgotPassword({
      email: 'missing@gmail.com',
    });

    expect(response).toEqual({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(passwordResetEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('builds the reset link from FRONTEND_BASE_URL', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'existing@gmail.com',
    });
    prisma.user.update.mockResolvedValue(undefined);

    await service.forgotPassword({
      email: 'existing@gmail.com',
    });

    const resetUrl = passwordResetEmailService.sendPasswordResetEmail.mock.calls[0][0]
      .resetUrl as string;
    expect(resetUrl.startsWith('https://trailcheck.app/auth/reset-password?token=')).toBe(true);
  });

  it('resets the password, clears the token, and invalidates old sessions', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 8,
      email: 'reset@gmail.com',
    });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const response = await service.resetPassword({
      token: 'a'.repeat(64),
      password: 'NewPassword123!',
    });

    expect(response).toEqual({
      message: 'Your password has been reset successfully.',
    });

    const updatePayload = prisma.user.updateMany.mock.calls[0][0];
    expect(updatePayload.data.resetPasswordTokenHash).toBeNull();
    expect(updatePayload.data.resetPasswordExpiresAt).toBeNull();
    expect(updatePayload.data.passwordVersion).toEqual({ increment: 1 });
    await expect(
      argon2.verify(updatePayload.data.password as string, 'NewPassword123!'),
    ).resolves.toBe(true);
  });

  it('rejects an expired or reused reset token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 8,
      email: 'reset@gmail.com',
    });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.resetPassword({
        token: 'b'.repeat(64),
        password: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing reset token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword({
        token: 'c'.repeat(64),
        password: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps unique email conflicts during signup', async () => {
    prisma.user.create.mockRejectedValue({
      code: 'P2002',
      clientVersion: '1.0.0',
    });

    await expect(
      service.signup({
        email: 'existing@gmail.com',
        password: 'StrongPassword123!',
        gender: 'OTHER',
        age: 28,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the generic forgot-password response when email delivery fails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'existing@gmail.com',
    });
    prisma.user.update.mockResolvedValue(undefined);
    passwordResetEmailService.sendPasswordResetEmail.mockRejectedValue(
      new Error('Resend email delivery failed with status 403: forbidden'),
    );

    const response = await service.forgotPassword({
      email: 'existing@gmail.com',
    });

    expect(response).toEqual({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Password reset email delivery failed for user 7'),
    );
  });

  it('returns the generic forgot-password response when the email provider is misconfigured', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'existing@gmail.com',
    });
    prisma.user.update.mockResolvedValue(undefined);
    passwordResetEmailService.sendPasswordResetEmail.mockResolvedValue({
      status: 'skipped',
      provider: 'disabled',
      reason: 'provider-disabled',
    });

    const response = await service.forgotPassword({
      email: 'existing@gmail.com',
    });

    expect(response).toEqual({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Password reset email send skipped for user 7'),
    );
  });

  it('does not leak the raw reset token into logs', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      email: 'existing@gmail.com',
    });
    prisma.user.update.mockResolvedValue(undefined);

    await service.forgotPassword({
      email: 'existing@gmail.com',
    });

    const resetUrl = passwordResetEmailService.sendPasswordResetEmail.mock.calls[0][0]
      .resetUrl as string;
    const token = new URL(resetUrl).searchParams.get('token');
    const allLogs = [
      ...logger.log.mock.calls.flat(),
      ...logger.warn.mock.calls.flat(),
      ...logger.error.mock.calls.flat(),
    ].join('\n');

    expect(token).toBeTruthy();
    expect(allLogs).not.toContain(token as string);
  });
});
