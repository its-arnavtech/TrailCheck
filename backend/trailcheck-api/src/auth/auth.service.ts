import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { PasswordResetEmailService } from './password-reset-email.service';

type AuthUser = {
  id: number;
  email: string;
  passwordVersion: number;
};

const FORGOT_PASSWORD_RESPONSE = {
  message:
    "If an account with that email exists, we've sent a password reset link.",
};

const RESET_PASSWORD_SUCCESS_RESPONSE = {
  message: 'Your password has been reset successfully.',
};

const INVALID_RESET_TOKEN_MESSAGE =
  'This password reset link is invalid or has expired.';

function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    'clientVersion' in error
  );
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  async signup(dto: SignupDto) {
    await this.prisma.requireConnection();

    const hash = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          gender: dto.gender,
          age: dto.age,
        },
      });

      return this.buildAuthResponse({
        id: user.id,
        email: user.email,
        passwordVersion: user.passwordVersion,
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2002') {
        throw new ConflictException(
          'An account with this email already exists.',
        );
      }

      throw error;
    }
  }

  async signin(dto: AuthDto) {
    await this.prisma.requireConnection();

    const user = await this.prisma.findAuthUserByEmail(dto.email);

    if (!user) {
      throw new ForbiddenException('Invalid email or password.');
    }

    let passwordMatches = false;

    try {
      passwordMatches = await argon2.verify(user.password, dto.password);
    } catch (error) {
      this.logger.warn(
        `Password verification failed for user ${user.id}: ${
          error instanceof Error ? error.message : 'Unknown password hash error'
        }`,
      );
      throw new ForbiddenException('Invalid email or password.');
    }

    if (!passwordMatches) {
      throw new ForbiddenException('Invalid email or password.');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      passwordVersion: user.passwordVersion,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.prisma.requireConnection();

    const startedAt = Date.now();
    const rawToken = this.generateResetToken();
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = this.buildResetExpiry();

    try {
      if (!(await this.prisma.supportsPasswordResetColumns())) {
        this.logger.warn(
          'Password reset requested, but reset token columns are unavailable in the current database schema.',
        );
        return FORGOT_PASSWORD_RESPONSE;
      }

      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: {
          id: true,
          email: true,
        },
      });

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: expiresAt,
          },
        });

        const resetUrl = this.buildResetUrl(rawToken);

        try {
          await this.passwordResetEmailService.sendPasswordResetEmail({
            to: user.email,
            resetUrl,
            expiresAt,
          });
          this.logger.log(`Password reset requested for user ${user.id}.`);
        } catch (error) {
          this.logger.error(
            `Password reset email delivery failed for user ${user.id}: ${
              error instanceof Error ? error.message : 'Unknown email error'
            }`,
          );
        }
      } else {
        this.logger.warn(
          `Password reset requested for unknown account fingerprint ${this.emailFingerprint(dto.email)}.`,
        );
      }
    } finally {
      await this.ensureMinimumResponseTime(startedAt);
    }

    return FORGOT_PASSWORD_RESPONSE;
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.prisma.requireConnection();

    if (!(await this.prisma.supportsPasswordResetColumns())) {
      this.logger.warn(
        'Password reset attempted, but reset token columns are unavailable in the current database schema.',
      );
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const tokenHash = this.hashResetToken(dto.token);

    const user = await this.prisma.user.findUnique({
      where: { resetPasswordTokenHash: tokenHash },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      this.logger.warn('Password reset rejected because the token was invalid.');
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await argon2.hash(dto.password);
    const updatedCount = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        password: passwordHash,
        passwordVersion: {
          increment: 1,
        },
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
      },
    });

    if (updatedCount.count !== 1) {
      this.logger.warn(
        `Password reset rejected for user ${user.id} because the token was expired or already used.`,
      );
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    this.logger.log(`Password reset completed for user ${user.id}.`);
    return RESET_PASSWORD_SUCCESS_RESPONSE;
  }

  private async buildAuthResponse(user: AuthUser) {
    return {
      access_token: await this.signToken(
        user.id,
        user.email,
        user.passwordVersion,
      ),
      user,
    };
  }

  private async signToken(
    userId: number,
    email: string,
    passwordVersion: number,
  ) {
    const payload = { sub: userId, email, passwordVersion };

    return this.jwt.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '1d',
    });
  }

  private generateResetToken() {
    return randomBytes(32).toString('hex');
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildResetExpiry() {
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        this.configService.getOrThrow<number>('PASSWORD_RESET_TOKEN_TTL_MINUTES'),
    );
    return expiresAt;
  }

  private buildResetUrl(rawToken: string) {
    const frontendBaseUrl =
      this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    const url = new URL('/auth/reset-password', frontendBaseUrl);
    url.searchParams.set('token', rawToken);
    return url.toString();
  }

  private emailFingerprint(email: string) {
    return createHash('sha256')
      .update(email)
      .digest('hex')
      .slice(0, 12);
  }

  private async ensureMinimumResponseTime(startedAt: number) {
    const minimumResponseMs = this.configService.getOrThrow<number>(
      'PASSWORD_RESET_MIN_RESPONSE_MS',
    );
    const elapsedMs = Date.now() - startedAt;

    if (elapsedMs >= minimumResponseMs) {
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, minimumResponseMs - elapsedMs),
    );
  }
}
