import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PassportStrategy,
} from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';
import {
  PrismaService,
} from '../../prisma/prisma.service.js';
import {
  env,
} from '../../config/env.js';

@Injectable()
export class JwtStrategy
extends PassportStrategy(
  Strategy,
) {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        env.jwtSecret,
    });
  }

  async validate(
    payload: {
      sub?: unknown;
      tenantId?: unknown;
      authVersion?: unknown;
    } | null,
  ) {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      typeof payload.tenantId !==
        'string' ||
      !payload.tenantId.trim()
    ) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
          authVersion: true,
          tenant: {
            select: {
              accessStatus: true,
              trialExpiresAt: true,
            },
          },
        },
      });

    if (
      !user ||
      !user.isActive ||
      user.tenantId !==
        payload.tenantId
    ) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    const trialExpired =
      user.tenant.accessStatus ===
        'TRIAL_ACTIVE' &&
      user.tenant.trialExpiresAt !==
        null &&
      user.tenant.trialExpiresAt
        .getTime() <=
        Date.now();

    if (
      trialExpired ||
      user.tenant.accessStatus ===
        'TRIAL_EXPIRED' ||
      user.tenant.accessStatus ===
        'SUSPENDED'
    ) {
      throw new UnauthorizedException(
        'Workspace access is unavailable',
      );
    }

    /*
     * New tokens always contain authVersion.
     *
     * Legacy pre-MFA tokens may temporarily omit it
     * for non-MFA accounts. Once MFA is enabled,
     * a token without authVersion is never accepted.
     */
    if (
      payload.authVersion !==
        undefined
    ) {
      if (
        typeof payload.authVersion !==
          'number' ||
        !Number.isInteger(
          payload.authVersion,
        ) ||
        payload.authVersion !==
          user.authVersion
      ) {
        throw new UnauthorizedException(
          'Invalid session',
        );
      }
    }
    else if (user.mfaEnabled) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    return {
      userId:
        user.id,
      tenantId:
        user.tenantId,
      email:
        user.email,
      role:
        user.role,
      authVersion:
        user.authVersion,
    };
  }
}
