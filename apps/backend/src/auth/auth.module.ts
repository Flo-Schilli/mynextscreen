import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { ProxyAwareThrottlerGuard } from './proxy-aware-throttler.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UnverifiedSignupCleanupService } from './unverified-signup-cleanup.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    CommonModule,
    UserModule,
    // Redis-backed rather than in-memory: an in-process counter resets on every
    // deploy and restart, which hands an attacker a fresh budget each time, and
    // it cannot hold a shared limit across more than one backend instance.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
        ),
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    UnverifiedSignupCleanupService,
    // Order matters: ProxyAwareThrottlerGuard first (rate limit before any work), then
    // JWT (sets req.user), then API-key (screen routes), then roles.
    {
      provide: APP_GUARD,
      useClass: ProxyAwareThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, TokenService, PasswordService],
})
export class AuthModule {}
