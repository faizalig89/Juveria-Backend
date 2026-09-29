import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  randomBytes,
} from 'node:crypto';
import {
  JwtService,
} from '@nestjs/jwt';
import {
  PrismaService,
} from '../prisma/prisma.service.js';
import {
  GoogleAuthService,
} from './google-auth.service.js';
import {
  MfaLoginService,
} from './mfa/mfa-login.service.js';
import {
  addOneCalendarMonth,
} from './trial-calendar.js';

type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  authVersion: number;
};

type LoginUser =
  SessionUser & {
    isActive: boolean;
    passwordHash: string | null;
    googleSubject: string | null;
    mfaEnabled: boolean;
    mfaSecretEncrypted:
      string | null;
    mfaLockedUntil:
      Date | null;
  };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly jwtService:
      JwtService,
    private readonly mfaLoginService:
      MfaLoginService,
    private readonly googleAuthService:
      GoogleAuthService,
  ) {}

  async login(
    email: string,
    password: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          email:
            email
              .trim()
              .toLowerCase(),
        },
      });

    if (
      !user ||
      !user.isActive ||
      !user.passwordHash
    ) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    return this.completeIdentityLogin(
      user,
    );
  }

  async googleLogin(
    credential: string,
  ) {
    const identity =
      await this.googleAuthService
        .verifyCredential(
          credential,
        );

    let user =
      await this.prisma.user.findUnique({
        where: {
          googleSubject:
            identity.subject,
        },
      });

    if (!user) {
      user =
        await this.prisma.user.findUnique({
          where: {
            email:
              identity.email,
          },
        });

      if (!user) {
        throw new UnauthorizedException(
          'No Juveria account exists for this Google identity. Start a free trial first.',
        );
      }

      if (
        user.googleSubject &&
        user.googleSubject !==
          identity.subject
      ) {
        throw new UnauthorizedException(
          'Google identity does not match this Juveria account',
        );
      }

      if (!user.googleSubject) {
        user =
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              googleSubject:
                identity.subject,
            },
          });
      }
    }

    return this.completeIdentityLogin(
      user,
    );
  }

  async startGoogleTrial(
    credential: string,
    companyName: string,
  ) {
    const identity =
      await this.googleAuthService
        .verifyCredential(
          credential,
        );

    const existing =
      await this.prisma.user.findFirst({
        where: {
          OR: [
            {
              email:
                identity.email,
            },
            {
              googleSubject:
                identity.subject,
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      throw new ConflictException(
        'A Juveria account already exists for this Google identity. Sign in instead.',
      );
    }

    const now =
      new Date();

    const trialExpiresAt =
      addOneCalendarMonth(
        now,
      );

    const normalizedCompanyName =
      companyName.trim();

    const slug =
      this.buildTrialSlug(
        normalizedCompanyName,
      );

    try {
      const created =
        await this.prisma.$transaction(
          async tx => {
            const tenant =
              await tx.tenant.create({
                data: {
                  name:
                    normalizedCompanyName,
                  slug,
                  accessStatus:
                    'TRIAL_ACTIVE',
                  trialStartedAt:
                    now,
                  trialExpiresAt,
                  erpEnabled:
                    false,
                  productionEnabled:
                    false,
                },
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  accessStatus: true,
                  trialStartedAt: true,
                  trialExpiresAt: true,
                  erpEnabled: true,
                  productionEnabled:
                    true,
                },
              });

            const admin =
              await tx.user.create({
                data: {
                  tenantId:
                    tenant.id,
                  email:
                    identity.email,
                  googleSubject:
                    identity.subject,
                  firstName:
                    identity.firstName,
                  lastName:
                    identity.lastName,
                  passwordHash:
                    null,
                  role:
                    'CLIENT_ADMIN',
                  isActive:
                    true,
                },
              });

            await tx.auditEvent.create({
              data: {
                tenantId:
                  tenant.id,
                actorUserId:
                  admin.id,
                actorEmail:
                  admin.email,
                actorRole:
                  admin.role,
                category:
                  'PLATFORM',
                action:
                  'TRIAL_STARTED',
                entityType:
                  'TENANT',
                entityId:
                  tenant.id,
                entityLabel:
                  tenant.name,
                outcome:
                  'SUCCESS',
                after: {
                  accessStatus:
                    tenant.accessStatus,
                  trialStartedAt:
                    tenant.trialStartedAt,
                  trialExpiresAt:
                    tenant.trialExpiresAt,
                  erpEnabled:
                    tenant.erpEnabled,
                  productionEnabled:
                    tenant.productionEnabled,
                },
                metadata: {
                  authentication:
                    'GOOGLE',
                },
              },
            });

            return {
              tenant,
              admin,
            };
          },
        );

      const session =
        await this.issueSession({
          id:
            created.admin.id,
          tenantId:
            created.admin.tenantId,
          email:
            created.admin.email,
          firstName:
            created.admin.firstName,
          lastName:
            created.admin.lastName,
          role:
            created.admin.role,
          authVersion:
            created.admin.authVersion,
        });

      return {
        ...session,
        trial: {
          accessStatus:
            created.tenant.accessStatus,
          startedAt:
            created.tenant.trialStartedAt,
          expiresAt:
            created.tenant.trialExpiresAt,
          erpEnabled:
            created.tenant.erpEnabled,
          productionEnabled:
            created.tenant.productionEnabled,
        },
        nextStep:
          'ENABLE_MFA',
      };
    } catch (cause) {
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        cause.code === 'P2002'
      ) {
        throw new ConflictException(
          'A Juveria trial already exists for this company or Google identity',
        );
      }

      throw cause;
    }
  }

  async verifyMfa(
    challengeToken: string,
    code: string,
  ) {
    const user =
      await this.mfaLoginService
        .verifyTotp(
          challengeToken,
          code,
        );

    await this.assertTenantAccess(
      user.tenantId,
    );

    return this.issueSession(
      user,
    );
  }

  async verifyRecoveryCode(
    challengeToken: string,
    recoveryCode: string,
  ) {
    const user =
      await this.mfaLoginService
        .verifyRecoveryCode(
          challengeToken,
          recoveryCode,
        );

    await this.assertTenantAccess(
      user.tenantId,
    );

    return this.issueSession(
      user,
    );
  }

  private async completeIdentityLogin(
    user: LoginUser,
  ) {
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Invalid account',
      );
    }

    await this.assertTenantAccess(
      user.tenantId,
    );

    /*
     * Password and Google identity both stop here when
     * MFA is enabled. A JWT is never issued before the
     * certified MFA challenge succeeds.
     */
    if (user.mfaEnabled) {
      const challenge =
        await this.mfaLoginService
          .createChallenge({
            id: user.id,
            authVersion:
              user.authVersion,
            mfaEnabled:
              user.mfaEnabled,
            mfaSecretEncrypted:
              user.mfaSecretEncrypted,
            mfaLockedUntil:
              user.mfaLockedUntil,
          });

      return {
        mfaRequired: true,
        challengeToken:
          challenge.challengeToken,
        expiresAt:
          challenge.expiresAt,
        email:
          user.email,
      };
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt:
          new Date(),
      },
    });

    return this.issueSession({
      id: user.id,
      tenantId:
        user.tenantId,
      email:
        user.email,
      firstName:
        user.firstName,
      lastName:
        user.lastName,
      role:
        user.role,
      authVersion:
        user.authVersion,
    });
  }

  private async assertTenantAccess(
    tenantId: string,
  ) {
    const tenant =
      await this.prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },
        select: {
          accessStatus: true,
          trialExpiresAt: true,
        },
      });

    if (!tenant) {
      throw new UnauthorizedException(
        'Workspace access is unavailable',
      );
    }

    const trialExpired =
      tenant.accessStatus ===
        'TRIAL_ACTIVE' &&
      tenant.trialExpiresAt !==
        null &&
      tenant.trialExpiresAt
        .getTime() <=
        Date.now();

    if (trialExpired) {
      await this.prisma.tenant
        .updateMany({
          where: {
            id: tenantId,
            accessStatus:
              'TRIAL_ACTIVE',
          },
          data: {
            accessStatus:
              'TRIAL_EXPIRED',
          },
        });

      throw new UnauthorizedException(
        'Your Juveria trial has expired',
      );
    }

    if (
      tenant.accessStatus ===
        'TRIAL_EXPIRED' ||
      tenant.accessStatus ===
        'SUSPENDED'
    ) {
      throw new UnauthorizedException(
        'Workspace access is unavailable',
      );
    }
  }

  private buildTrialSlug(
    companyName: string,
  ) {
    const base =
      companyName
        .toLowerCase()
        .normalize('NFKD')
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        )
        .slice(0, 48) ||
      'trial';

    return (
      base +
      '-' +
      randomBytes(4)
        .toString('hex')
    );
  }

  private async issueSession(
    user: SessionUser,
  ) {
    const payload = {
      sub: user.id,
      tenantId:
        user.tenantId,
      email:
        user.email,
      role:
        user.role,
      authVersion:
        user.authVersion,
    };

    const accessToken =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      mfaRequired: false,
      accessToken,
      user: {
        id: user.id,
        tenantId:
          user.tenantId,
        email:
          user.email,
        firstName:
          user.firstName,
        lastName:
          user.lastName,
        role:
          user.role,
      },
    };
  }
}
