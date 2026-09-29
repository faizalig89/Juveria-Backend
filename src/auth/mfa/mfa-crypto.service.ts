import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

@Injectable()
export class MfaCryptoService {
  private readonly key: Buffer;

  constructor() {
    const encodedKey =
      process.env.MFA_ENCRYPTION_KEY?.trim();

    if (!encodedKey) {
      throw new Error(
        'MFA_ENCRYPTION_KEY is required',
      );
    }

    const decodedKey = Buffer.from(
      encodedKey,
      'base64',
    );

    if (decodedKey.length !== 32) {
      throw new Error(
        'MFA_ENCRYPTION_KEY must decode to exactly 32 bytes',
      );
    }

    this.key = decodedKey;
  }

  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error(
        'Cannot encrypt an empty MFA secret',
      );
    }

    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key,
      iv,
    );

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      authTag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(encryptedValue: string): string {
    try {
      const parts = encryptedValue.split('.');

      if (
        parts.length !== 4 ||
        parts[0] !== 'v1'
      ) {
        throw new Error(
          'Unsupported encrypted MFA value',
        );
      }

      const iv = Buffer.from(
        parts[1],
        'base64url',
      );

      const authTag = Buffer.from(
        parts[2],
        'base64url',
      );

      const ciphertext = Buffer.from(
        parts[3],
        'base64url',
      );

      if (iv.length !== 12) {
        throw new Error(
          'Invalid MFA encryption IV',
        );
      }

      if (authTag.length !== 16) {
        throw new Error(
          'Invalid MFA authentication tag',
        );
      }

      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        iv,
      );

      decipher.setAuthTag(authTag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return plaintext.toString('utf8');
    }
    catch {
      throw new InternalServerErrorException(
        'Unable to decrypt MFA secret',
      );
    }
  }
}
