import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { SignupDto } from './dto/signup.dto';

type AuthUser = {
  id: number;
  email: string;
};

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ForbiddenException('Invalid email or password.');
    }

    const passwordMatches = await argon2.verify(user.password, dto.password);

    if (!passwordMatches) {
      throw new ForbiddenException('Invalid email or password.');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
    });
  }

  private async buildAuthResponse(user: AuthUser) {
    return {
      access_token: await this.signToken(user.id, user.email),
      user,
    };
  }

  private async signToken(userId: number, email: string) {
    const payload = { sub: userId, email };

    return this.jwt.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '1d',
    });
  }
}
