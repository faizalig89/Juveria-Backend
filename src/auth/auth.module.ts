import {
  Module,
} from '@nestjs/common';
import {
  JwtModule,
} from '@nestjs/jwt';
import {
  PassportModule,
} from '@nestjs/passport';
import {
  env,
} from '../config/env.js';
import {
  AuthController,
} from './auth.controller.js';
import {
  AuthService,
} from './auth.service.js';
import {
  GoogleAuthService,
} from './google-auth.service.js';
import {
  MfaCryptoService,
} from './mfa/mfa-crypto.service.js';
import {
  MfaEnrollmentService,
} from './mfa/mfa-enrollment.service.js';
import {
  MfaLoginService,
} from './mfa/mfa-login.service.js';
import {
  MfaTotpService,
} from './mfa/mfa-totp.service.js';
import {
  RolesGuard,
} from './roles.guard.js';
import {
  JwtStrategy,
} from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret:
        env.jwtSecret,
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    GoogleAuthService,
    JwtStrategy,
    RolesGuard,
    MfaCryptoService,
    MfaTotpService,
    MfaEnrollmentService,
    MfaLoginService,
  ],
  exports: [
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
