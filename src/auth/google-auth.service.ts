import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OAuth2Client,
} from 'google-auth-library';
import {
  env,
} from '../config/env.js';

export type GoogleIdentity = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string | null;
};

@Injectable()
export class GoogleAuthService {
  private readonly client =
    new OAuth2Client();

  async verifyCredential(
    credential: string,
  ): Promise<GoogleIdentity> {
    if (!env.googleClientId) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured',
      );
    }

    try {
      const ticket =
        await this.client.verifyIdToken({
          idToken: credential,
          audience:
            env.googleClientId,
        });

      const payload =
        ticket.getPayload();

      if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !==
          true
      ) {
        throw new UnauthorizedException(
          'Google account verification failed',
        );
      }

      const email =
        payload.email
          .trim()
          .toLowerCase();

      if (!email) {
        throw new UnauthorizedException(
          'Google account verification failed',
        );
      }

      const firstName =
        payload.given_name?.trim() ||
        payload.name?.trim() ||
        email.split('@')[0] ||
        'Juveria';

      const lastName =
        payload.family_name?.trim() ||
        null;

      return {
        subject: payload.sub,
        email,
        firstName,
        lastName,
      };
    } catch (cause) {
      if (
        cause instanceof
          ServiceUnavailableException ||
        cause instanceof
          UnauthorizedException
      ) {
        throw cause;
      }

      throw new UnauthorizedException(
        'Google account verification failed',
      );
    }
  }
}
