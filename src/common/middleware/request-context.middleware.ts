import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  NextFunction,
  Request,
  Response,
} from 'express';

const REQUEST_ID_PATTERN =
  /^[A-Za-z0-9._:-]{1,128}$/;

@Injectable()
export class RequestContextMiddleware
  implements NestMiddleware
{
  private readonly logger =
    new Logger('HTTP');

  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const suppliedRequestId =
      req.header('x-request-id');

    const requestId =
      suppliedRequestId &&
      REQUEST_ID_PATTERN.test(
        suppliedRequestId,
      )
        ? suppliedRequestId
        : randomUUID();

    res.setHeader(
      'X-Request-ID',
      requestId,
    );

    const startedAt =
      process.hrtime.bigint();

    res.on('finish', () => {
      const durationNs =
        process.hrtime.bigint() -
        startedAt;

      const durationMs =
        Number(durationNs) / 1_000_000;

      const logRecord = {
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs:
          Math.round(durationMs * 100) /
          100,
      };

      this.logger.log(
        JSON.stringify(logRecord),
      );
    });

    next();
  }
}
