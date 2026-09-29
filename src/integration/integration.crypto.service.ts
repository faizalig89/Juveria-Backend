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
export class IntegrationCryptoService {
  private key(): Buffer {
    const encoded =
      process.env.ERP_INTEGRATION_ENCRYPTION_KEY?.trim();

    if (!encoded) {
      throw new InternalServerErrorException(
        'ERP integration encryption key is not configured',
      );
    }

    const key =
      Buffer.from(encoded, 'base64');

    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'ERP integration encryption key must decode to 32 bytes',
      );
    }

    return key;
  }

  encrypt(value: Record<string, unknown>): string {
    const iv = randomBytes(12);
    const cipher =
      createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext =
      Buffer.concat([
        cipher.update(JSON.stringify(value), 'utf8'),
        cipher.final(),
      ]);
    const tag = cipher.getAuthTag();

    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): Record<string, unknown> {
    try {
      const [version, ivText, tagText, cipherText] =
        value.split('.');

      if (
        version !== 'v1' ||
        !ivText ||
        !tagText ||
        !cipherText
      ) {
        throw new Error('invalid encrypted value');
      }

      const iv = Buffer.from(ivText, 'base64url');
      const tag = Buffer.from(tagText, 'base64url');
      const ciphertext =
        Buffer.from(cipherText, 'base64url');

      if (iv.length !== 12) {
        throw new Error('invalid iv');
      }

      const decipher =
        createDecipheriv('aes-256-gcm', this.key(), iv);
      decipher.setAuthTag(tag);

      const plaintext =
        Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString('utf8');

      const parsed = JSON.parse(plaintext);

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new Error('invalid credentials');
      }

      return parsed as Record<string, unknown>;
    } catch {
      throw new InternalServerErrorException(
        'Unable to decrypt ERP integration credentials',
      );
    }
  }
}
