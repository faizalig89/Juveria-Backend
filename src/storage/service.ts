import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createReadStream,
  existsSync,
} from 'fs';
import {
  basename,
  join,
  resolve,
} from 'path';
import { env } from '../config/env.js';

@Injectable()
export class StorageService {
  private readonly uploadDirectory =
    env.storageRoot
      ? resolve(env.storageRoot)
      : join(
          process.cwd(),
          'uploads',
        );

  getUploadDirectory(): string {
    return this.uploadDirectory;
  }

  getFilePath(storageKey: string): string {
    const uploadRoot = resolve(
      this.uploadDirectory,
    );

    const requestedPath = resolve(
      uploadRoot,
      storageKey,
    );

    // Security: never allow a storage key to escape uploads.
    if (
      requestedPath !== uploadRoot &&
      !requestedPath.startsWith(
        uploadRoot + '\\',
      ) &&
      !requestedPath.startsWith(
        uploadRoot + '/',
      )
    ) {
      throw new NotFoundException(
        'Document file not found',
      );
    }

    // Current / exact storage-key location.
    if (existsSync(requestedPath)) {
      return requestedPath;
    }

    // Backward compatibility for legacy storage keys such as:
    // local/<tenantId>/<filename>.pdf
    // where the physical file was stored directly in uploads/.
    const legacyPath = resolve(
      uploadRoot,
      basename(storageKey),
    );

    if (existsSync(legacyPath)) {
      return legacyPath;
    }

    throw new NotFoundException(
      'Document file not found',
    );
  }

  generateFileName(
    originalName: string,
  ): string {
    const extension = originalName.includes('.')
      ? originalName.substring(
          originalName.lastIndexOf('.'),
        ).toLowerCase()
      : '';

    return `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;
  }

  createReadStream(storageKey: string) {
    const filePath =
      this.getFilePath(storageKey);

    return createReadStream(filePath);
  }
}