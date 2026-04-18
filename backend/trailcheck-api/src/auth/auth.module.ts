import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/primsa.module';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetEmailService } from './password-reset-email.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtStrategy, PasswordResetEmailService],
  controllers: [AuthController],
})
export class AuthModule {}
