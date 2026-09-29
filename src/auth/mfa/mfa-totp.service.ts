import { Injectable } from '@nestjs/common';
import {
  generateSecret,
  generateURI,
  verify,
} from 'otplib';

type LoginTotpVerification =
  | {
      valid: false;
    }
  | {
      valid: true;
      timeStep: number;
    };

@Injectable()
export class MfaTotpService {
  private readonly issuer = 'Juveria';

  private static readonly PERIOD_SECONDS = 30;

  createEnrollment(email: string) {
    const secret = generateSecret({
      length: 20,
    });

    const otpauthUri = generateURI({
      issuer: this.issuer,
      label: email,
      secret,
    });

    return {
      secret,
      otpauthUri,
    };
  }

  async verifyToken(
    secret: string,
    token: string,
  ): Promise<boolean> {
    if (!/^\d{6}$/.test(token)) {
      return false;
    }

    const result = await verify({
      secret,
      token,
      period:
        MfaTotpService.PERIOD_SECONDS,
      epochTolerance: 30,
    });

    return result.valid;
  }

  async verifyLoginToken(
    secret: string,
    token: string,
    afterTimeStep?: number,
  ): Promise<LoginTotpVerification> {
    if (!/^\d{6}$/.test(token)) {
      return {
        valid: false,
      };
    }

    /*
     * We deliberately do not depend on optional
     * metadata fields returned by the otplib facade.
     *
     * Instead, calculate the candidate RFC 6238
     * time-step ourselves and verify each permitted
     * step explicitly.
     *
     * Accepted window:
     *   - current 30-second period
     *   - immediately previous period
     *
     * Future periods are never accepted.
     */
    const period =
      MfaTotpService.PERIOD_SECONDS;

    const currentEpoch =
      Math.floor(Date.now() / 1000);

    const currentTimeStep =
      Math.floor(
        currentEpoch / period,
      );

    const candidates = [
      currentTimeStep,
      currentTimeStep - 1,
    ];

    for (const timeStep of candidates) {
      if (
        afterTimeStep !== undefined &&
        timeStep <= afterTimeStep
      ) {
        continue;
      }

      const candidateEpoch =
        timeStep * period;

      try {
        const result = await verify({
          secret,
          token,
          period,
          epoch: candidateEpoch,

          /*
           * Verification is pinned to this exact
           * candidate step. The allowed drift is
           * implemented explicitly by candidates[].
           */
          epochTolerance: 0,
        });

        if (result.valid) {
          return {
            valid: true,
            timeStep,
          };
        }
      }
      catch {
        // Try next permitted candidate.
      }
    }

    return {
      valid: false,
    };
  }
}
