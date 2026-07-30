import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { OwnershipService } from './ownership.service';

/**
 * Global so every feature module can inject OwnershipService and so the
 * app-wide JwtAuthGuard can resolve JwtService.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_12345!',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OwnershipService],
  exports: [AuthService, OwnershipService, JwtModule],
})
export class AuthModule {}
