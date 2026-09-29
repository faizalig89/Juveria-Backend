import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MfaCryptoService } from './mfa-crypto.service.js';
import { MfaTotpService } from './mfa-totp.service.js';

@Injectable()
export class MfaEnrollmentService {
  private static readonly ENROLLMENT_TTL_MS =
    10 * 60 * 1000;

  private static readonly RECOVERY_CODE_COUNT = 10;

  private static readonly RECOVERY_HASH_COST = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: MfaCryptoService,
    private readonly totpService: MfaTotpService,
  ) {}

  async status(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          isActive: true,
          mfaEnabled: true,
          mfaPendingExpiresAt: true,
          mfaLockedUntil: true,
        },
      });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    const now =
      Date.now();

    const enrollmentPending =
      !user.mfaEnabled &&
      Boolean(
        user.mfaPendingExpiresAt &&
        user.mfaPendingExpiresAt.getTime() >
          now,
      );

    const recoveryCodesRemaining =
      user.mfaEnabled
        ? await this.prisma.mfaRecoveryCode.count({
            where: {
              userId: user.id,
              usedAt: null,
            },
          })
        : 0;

    return {
      mfaEnabled:
        user.mfaEnabled,

      enrollmentPending,

      enrollmentExpiresAt:
        enrollmentPending
          ? user.mfaPendingExpiresAt
          : null,

      recoveryCodesRemaining,

      lockedUntil:
        user.mfaLockedUntil &&
        user.mfaLockedUntil.getTime() >
          now
          ? user.mfaLockedUntil
          : null,
    };
  }

  async start(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        mfaEnabled: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    if (user.mfaEnabled) {
      throw new ConflictException(
        'MFA is already enabled',
      );
    }

    const enrollment =
      this.totpService.createEnrollment(user.email);

    const encryptedSecret =
      this.cryptoService.encrypt(
        enrollment.secret,
      );

    const expiresAt = new Date(
      Date.now() +
        MfaEnrollmentService.ENROLLMENT_TTL_MS,
    );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        mfaPendingSecretEncrypted:
          encryptedSecret,
        mfaPendingExpiresAt: expiresAt,
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
      },
    });

    return {
      mfaEnabled: false,
      enrollmentRequired: true,
      otpauthUri: enrollment.otpauthUri,

      // This is intentionally returned only during
      // enrollment so the user can manually enter the
      // secret if QR provisioning is unavailable.
      manualEntryKey: enrollment.secret,

      expiresAt,
    };
  }

  async confirm(
    userId: string,
    code: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isActive: true,
        mfaEnabled: true,
        mfaPendingSecretEncrypted: true,
        mfaPendingExpiresAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    if (user.mfaEnabled) {
      throw new ConflictException(
        'MFA is already enabled',
      );
    }

    if (
      !user.mfaPendingSecretEncrypted ||
      !user.mfaPendingExpiresAt
    ) {
      throw new BadRequestException(
        'No MFA enrollment is pending',
      );
    }

    if (
      user.mfaPendingExpiresAt.getTime() <=
      Date.now()
    ) {
      await this.prisma.user.updateMany({
        where: {
          id: user.id,
          mfaEnabled: false,
        },
        data: {
          mfaPendingSecretEncrypted: null,
          mfaPendingExpiresAt: null,
        },
      });

      throw new BadRequestException(
        'MFA enrollment has expired. Start enrollment again.',
      );
    }

    const secret =
      this.cryptoService.decrypt(
        user.mfaPendingSecretEncrypted,
      );

    const valid =
      await this.totpService.verifyToken(
        secret,
        code,
      );

    if (!valid) {
      throw new BadRequestException(
        'Invalid authenticator code',
      );
    }

    const recoveryCodes =
      this.generateRecoveryCodes();

    const recoveryHashes =
      await Promise.all(
        recoveryCodes.map((recoveryCode) =>
          bcrypt.hash(
            recoveryCode,
            MfaEnrollmentService.RECOVERY_HASH_COST,
          ),
        ),
      );

    await this.prisma.$transaction(
      async (tx) => {
        /*
         * Atomic activation guard.
         *
         * If two confirm requests race, only one may
         * transition the account from mfaEnabled=false
         * to mfaEnabled=true.
         */
        const activation =
          await tx.user.updateMany({
            where: {
              id: user.id,
              isActive: true,
              mfaEnabled: false,
              mfaPendingSecretEncrypted:
                user.mfaPendingSecretEncrypted,
              mfaPendingExpiresAt: {
                gt: new Date(),
              },
            },
            data: {
              mfaEnabled: true,
              mfaSecretEncrypted:
                user.mfaPendingSecretEncrypted,

              mfaPendingSecretEncrypted: null,
              mfaPendingExpiresAt: null,

              mfaFailedAttempts: 0,
              mfaLockedUntil: null,
              mfaLastUsedStep: null,

              /*
               * Enabling MFA invalidates access tokens
               * issued before MFA activation.
               */
              authVersion: {
                increment: 1,
              },
            },
          });

        if (activation.count !== 1) {
          throw new ConflictException(
            'MFA enrollment state changed. Start enrollment again.',
          );
        }

        await tx.mfaRecoveryCode.deleteMany({
          where: {
            userId: user.id,
          },
        });

        await tx.mfaRecoveryCode.createMany({
          data: recoveryHashes.map(
            (codeHash) => ({
              userId: user.id,
              codeHash,
            }),
          ),
        });
      },
    );

    return {
      mfaEnabled: true,

      /*
       * These plaintext recovery codes are returned
       * ONCE. Only bcrypt hashes are stored.
       */
      recoveryCodes,
    };
  }

  private generateRecoveryCodes(): string[] {
    return Array.from(
      {
        length:
          MfaEnrollmentService.RECOVERY_CODE_COUNT,
      },
      () => {
        const raw =
          randomBytes(10)
            .toString('hex')
            .toUpperCase();

        return (
          raw.match(/.{1,5}/g)?.join('-') ??
          raw
        );
      },
    );
  }
}
