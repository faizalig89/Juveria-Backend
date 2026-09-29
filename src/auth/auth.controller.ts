import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  Throttle,
} from '@nestjs/throttler';
import {
  AuthService,
} from './auth.service.js';
import {
  GoogleCredentialDto,
} from './dto/google-credential.dto.js';
import {
  GoogleTrialDto,
} from './dto/google-trial.dto.js';
import {
  LoginDto,
} from './dto/login.dto.js';
import {
  JwtAuthGuard,
} from './jwt-auth.guard.js';
import {
  ConfirmMfaEnrollmentDto,
} from './mfa/dto/confirm-mfa-enrollment.dto.js';
import {
  VerifyMfaLoginDto,
} from './mfa/dto/verify-mfa-login.dto.js';
import {
  VerifyMfaRecoveryDto,
} from './mfa/dto/verify-mfa-recovery.dto.js';
import {
  MfaEnrollmentService,
} from './mfa/mfa-enrollment.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService:
      AuthService,
    private readonly mfaEnrollmentService:
      MfaEnrollmentService,
  ) {}

  @Post('login')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async login(
    @Body() body: LoginDto,
  ) {
    return this.authService.login(
      body.email,
      body.password,
    );
  }

  @Post('google')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async googleLogin(
    @Body()
    body: GoogleCredentialDto,
  ) {
    return this.authService
      .googleLogin(
        body.credential,
      );
  }

  @Post('trial/google')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async startGoogleTrial(
    @Body()
    body: GoogleTrialDto,
  ) {
    return this.authService
      .startGoogleTrial(
        body.credential,
        body.companyName,
      );
  }

  @Post('mfa/verify')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async verifyMfa(
    @Body() body: VerifyMfaLoginDto,
  ) {
    return this.authService.verifyMfa(
      body.challengeToken,
      body.code,
    );
  }

  @Post('mfa/recovery/verify')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async verifyRecovery(
    @Body()
    body: VerifyMfaRecoveryDto,
  ) {
    return this.authService.verifyRecoveryCode(
      body.challengeToken,
      body.recoveryCode,
    );
  }

  @Get('mfa/status')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async getMfaStatus(
    @Req() req: any,
  ) {
    return this.mfaEnrollmentService.status(
      req.user.userId,
    );
  }

  @Post('mfa/enroll/start')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async startMfaEnrollment(
    @Req() req: any,
  ) {
    return this.mfaEnrollmentService.start(
      req.user.userId,
    );
  }

  @Post('mfa/enroll/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  async confirmMfaEnrollment(
    @Req() req: any,
    @Body()
    body: ConfirmMfaEnrollmentDto,
  ) {
    return this.mfaEnrollmentService.confirm(
      req.user.userId,
      body.code,
    );
  }
}
