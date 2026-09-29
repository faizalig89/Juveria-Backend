import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  createHash,
  randomBytes,
} from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MfaCryptoService } from './mfa-crypto.service.js';
import { MfaTotpService } from './mfa-totp.service.js';

type ChallengeUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  isActive: boolean;
  authVersion: number;
  mfaEnabled: boolean;
  mfaSecretEncrypted: string | null;
  mfaFailedAttempts: number;
  mfaLockedUntil: Date | null;
  mfaLastUsedStep: bigint | null;
};

@Injectable()
export class MfaLoginService {
  private static readonly CHALLENGE_TTL_MS =
    5 * 60 * 1000;

  private static readonly MAX_ATTEMPTS = 5;

  private static readonly LOCKOUT_MS =
    15 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: MfaCryptoService,
    private readonly totpService: MfaTotpService,
  ) {}

  async createChallenge(user: {
    id: string;
    authVersion: number;
    mfaEnabled: boolean;
    mfaSecretEncrypted: string | null;
    mfaLockedUntil: Date | null;
  }) {
    if (
      !user.mfaEnabled ||
      !user.mfaSecretEncrypted
    ) {
      throw new UnauthorizedException(
        'Unable to complete MFA login',
      );
    }

    if (
      user.mfaLockedUntil &&
      user.mfaLockedUntil.getTime() >
        Date.now()
    ) {
      throw new HttpException(
        'MFA temporarily locked',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const challengeToken =
      randomBytes(32).toString('base64url');

    const tokenHash =
      this.hashChallengeToken(
        challengeToken,
      );

    const now = new Date();

    const expiresAt = new Date(
      now.getTime() +
        MfaLoginService.CHALLENGE_TTL_MS,
    );

    await this.prisma.$transaction(
      async (tx) => {
        /*
         * A successful password login creates one
         * current MFA challenge. Older outstanding
         * challenges for the same user are invalidated.
         */
        await tx.mfaChallenge.updateMany({
          where: {
            userId: user.id,
            consumedAt: null,
          },
          data: {
            consumedAt: now,
          },
        });

        await tx.mfaChallenge.create({
          data: {
            userId: user.id,
            tokenHash,
            authVersion:
              user.authVersion,
            attempts: 0,
            expiresAt,
          },
        });

        /*
         * Remove old challenge records that no longer
         * have authentication value.
         */
        await tx.mfaChallenge.deleteMany({
          where: {
            userId: user.id,
            OR: [
              {
                expiresAt: {
                  lt: new Date(
                    now.getTime() -
                      24 * 60 * 60 * 1000,
                  ),
                },
              },
              {
                consumedAt: {
                  lt: new Date(
                    now.getTime() -
                      24 * 60 * 60 * 1000,
                  ),
                },
              },
            ],
          },
        });
      },
    );

    return {
      challengeToken,
      expiresAt,
    };
  }

  async verifyTotp(
    challengeToken: string,
    code: string,
  ) {
    const {
      challenge,
      user,
    } =
      await this.loadValidChallenge(
        challengeToken,
      );

    const secret =
      this.cryptoService.decrypt(
        user.mfaSecretEncrypted!,
      );

    const lastTimeStep =
      user.mfaLastUsedStep === null
        ? undefined
        : Number(
            user.mfaLastUsedStep,
          );

    const verification =
      await this.totpService.verifyLoginToken(
        secret,
        code,
        lastTimeStep,
      );

    if (!verification.valid) {
      await this.recordFailure(
        challenge.id,
        user.id,
      );

      throw new UnauthorizedException(
        'Invalid MFA code',
      );
    }

    const matchedTimeStep =
      BigInt(verification.timeStep);

    const now = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        const consumed =
          await tx.mfaChallenge.updateMany({
            where: {
              id: challenge.id,
              consumedAt: null,
              expiresAt: {
                gt: now,
              },
              authVersion:
                user.authVersion,
            },
            data: {
              consumedAt: now,
            },
          });

        if (consumed.count !== 1) {
          throw new UnauthorizedException(
            'Invalid or expired MFA challenge',
          );
        }

        /*
         * The time-step comparison is repeated
         * atomically here. This prevents two concurrent
         * requests using the same valid TOTP from both
         * succeeding.
         */
        const updated =
          await tx.user.updateMany({
            where: {
              id: user.id,
              isActive: true,
              mfaEnabled: true,
              authVersion:
                user.authVersion,
              OR: [
                {
                  mfaLastUsedStep: null,
                },
                {
                  mfaLastUsedStep: {
                    lt: matchedTimeStep,
                  },
                },
              ],
            },
            data: {
              mfaLastUsedStep:
                matchedTimeStep,
              mfaFailedAttempts: 0,
              mfaLockedUntil: null,
              lastLoginAt: now,
            },
          });

        if (updated.count !== 1) {
          throw new UnauthorizedException(
            'MFA code has already been used',
          );
        }
      },
    );

    return this.getSessionUser(
      user.id,
    );
  }

  async verifyRecoveryCode(
    challengeToken: string,
    recoveryCode: string,
  ) {
    const {
      challenge,
      user,
    } =
      await this.loadValidChallenge(
        challengeToken,
      );

    const normalizedCode =
      recoveryCode
        .trim()
        .toUpperCase();

    const recoveryCodes =
      await this.prisma.mfaRecoveryCode.findMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        select: {
          id: true,
          codeHash: true,
        },
      });

    let matchedRecoveryCode:
      | {
          id: string;
          codeHash: string;
        }
      | undefined;

    for (
      const candidate of recoveryCodes
    ) {
      const matches =
        await bcrypt.compare(
          normalizedCode,
          candidate.codeHash,
        );

      if (matches) {
        matchedRecoveryCode =
          candidate;
        break;
      }
    }

    if (!matchedRecoveryCode) {
      await this.recordFailure(
        challenge.id,
        user.id,
      );

      throw new UnauthorizedException(
        'Invalid recovery code',
      );
    }

    const now = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        const consumed =
          await tx.mfaChallenge.updateMany({
            where: {
              id: challenge.id,
              consumedAt: null,
              expiresAt: {
                gt: now,
              },
              authVersion:
                user.authVersion,
            },
            data: {
              consumedAt: now,
            },
          });

        if (consumed.count !== 1) {
          throw new UnauthorizedException(
            'Invalid or expired MFA challenge',
          );
        }

        const recoveryUsed =
          await tx.mfaRecoveryCode.updateMany({
            where: {
              id:
                matchedRecoveryCode.id,
              userId: user.id,
              usedAt: null,
            },
            data: {
              usedAt: now,
            },
          });

        if (
          recoveryUsed.count !== 1
        ) {
          throw new UnauthorizedException(
            'Recovery code has already been used',
          );
        }

        const userUpdated =
          await tx.user.updateMany({
            where: {
              id: user.id,
              isActive: true,
              mfaEnabled: true,
              authVersion:
                user.authVersion,
            },
            data: {
              mfaFailedAttempts: 0,
              mfaLockedUntil: null,
              lastLoginAt: now,
            },
          });

        if (
          userUpdated.count !== 1
        ) {
          throw new UnauthorizedException(
            'Invalid MFA session',
          );
        }
      },
    );

    return this.getSessionUser(
      user.id,
    );
  }

  private async loadValidChallenge(
    rawToken: string,
  ): Promise<{
    challenge: {
      id: string;
      userId: string;
      authVersion: number;
      attempts: number;
      expiresAt: Date;
      consumedAt: Date | null;
    };
    user: ChallengeUser;
  }> {
    const tokenHash =
      this.hashChallengeToken(
        rawToken,
      );

    const challenge =
      await this.prisma.mfaChallenge.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          userId: true,
          authVersion: true,
          attempts: true,
          expiresAt: true,
          consumedAt: true,
        },
      });

    if (
      !challenge ||
      challenge.consumedAt
    ) {
      throw new UnauthorizedException(
        'Invalid or expired MFA challenge',
      );
    }

    const now = new Date();

    if (
      challenge.expiresAt.getTime() <=
      now.getTime()
    ) {
      await this.prisma.mfaChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      throw new UnauthorizedException(
        'Invalid or expired MFA challenge',
      );
    }

    if (
      challenge.attempts >=
      MfaLoginService.MAX_ATTEMPTS
    ) {
      throw new UnauthorizedException(
        'Invalid or expired MFA challenge',
      );
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: challenge.userId,
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          authVersion: true,
          mfaEnabled: true,
          mfaSecretEncrypted: true,
          mfaFailedAttempts: true,
          mfaLockedUntil: true,
          mfaLastUsedStep: true,
        },
      });

    if (
      !user ||
      !user.isActive ||
      !user.mfaEnabled ||
      !user.mfaSecretEncrypted ||
      user.authVersion !==
        challenge.authVersion
    ) {
      await this.prisma.mfaChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      throw new UnauthorizedException(
        'Invalid or expired MFA challenge',
      );
    }

    if (
      user.mfaLockedUntil &&
      user.mfaLockedUntil.getTime() >
        now.getTime()
    ) {
      throw new HttpException(
        'MFA temporarily locked',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return {
      challenge,
      user,
    };
  }

  private async recordFailure(
    challengeId: string,
    userId: string,
  ) {
    const now = new Date();

    const state =
      await this.prisma.$transaction(
        async (tx) => {
          const changedChallenge =
            await tx.mfaChallenge.updateMany({
              where: {
                id: challengeId,
                consumedAt: null,
                expiresAt: {
                  gt: now,
                },
              },
              data: {
                attempts: {
                  increment: 1,
                },
              },
            });

          if (
            changedChallenge.count !== 1
          ) {
            return {
              locked: false,
            };
          }

          const challenge =
            await tx.mfaChallenge.findUnique({
              where: {
                id: challengeId,
              },
              select: {
                attempts: true,
              },
            });

          const changedUser =
            await tx.user.updateMany({
              where: {
                id: userId,
                isActive: true,
              },
              data: {
                mfaFailedAttempts: {
                  increment: 1,
                },
              },
            });

          if (
            changedUser.count !== 1
          ) {
            return {
              locked: false,
            };
          }

          const user =
            await tx.user.findUnique({
              where: {
                id: userId,
              },
              select: {
                mfaFailedAttempts: true,
              },
            });

          if (
            challenge &&
            challenge.attempts >=
              MfaLoginService.MAX_ATTEMPTS
          ) {
            await tx.mfaChallenge.updateMany({
              where: {
                id: challengeId,
                consumedAt: null,
              },
              data: {
                consumedAt: now,
              },
            });
          }

          const shouldLock =
            !!user &&
            user.mfaFailedAttempts >=
              MfaLoginService.MAX_ATTEMPTS;

          if (shouldLock) {
            await tx.user.update({
              where: {
                id: userId,
              },
              data: {
                mfaLockedUntil:
                  new Date(
                    now.getTime() +
                      MfaLoginService.LOCKOUT_MS,
                  ),
              },
            });
          }

          return {
            locked: shouldLock,
          };
        },
      );

    if (state.locked) {
      throw new HttpException(
        'MFA temporarily locked',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async getSessionUser(
    userId: string,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          tenantId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          authVersion: true,
          isActive: true,
        },
      });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    return user;
  }

  private hashChallengeToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token, 'utf8')
      .digest('hex');
  }
}
