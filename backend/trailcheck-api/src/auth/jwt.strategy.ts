import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: number;
  email: string;
  passwordVersion: number;
};

export type JwtUser = {
  id: number;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    await this.prisma.requireConnection();

    const user = await this.prisma.findJwtUserById(payload.sub);

    if (
      !user ||
      user.email !== payload.email ||
      user.passwordVersion !== payload.passwordVersion
    ) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
