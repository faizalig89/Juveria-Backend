import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mainPath = path.join(root, 'src', 'main.ts');
const middlewareDir = path.join(root, 'src', 'common', 'middleware');
const middlewarePath = path.join(middlewareDir, 'request-context.middleware.ts');

const main = fs.readFileSync(mainPath, 'utf8');

if (!main.includes("import { AppModule } from './app.module.js';")) {
  throw new Error('Expected AppModule import not found. No changes written.');
}

if (main.includes('RequestContextMiddleware')) {
  throw new Error('Stage 16.3 appears already installed. No changes written.');
}

fs.mkdirSync(middlewareDir, { recursive: true });

fs.copyFileSync(
  mainPath,
  `${mainPath}.stage16-3-backup`,
);

const middleware = `import {
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
`;

fs.writeFileSync(
  middlewarePath,
  middleware,
  { encoding: 'utf8' },
);

let patchedMain = main.replace(
  "import { AppModule } from './app.module.js';",
  "import { AppModule } from './app.module.js';\nimport { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';",
);

patchedMain = patchedMain.replace(
  '  app.use(helmet());',
  `  app.use(
    new RequestContextMiddleware().use.bind(
      new RequestContextMiddleware(),
    ),
  );

  app.use(helmet());`,
);

if (
  !patchedMain.includes(
    'RequestContextMiddleware',
  )
) {
  throw new Error(
    'Request middleware insertion failed.',
  );
}

fs.writeFileSync(
  mainPath,
  patchedMain,
  { encoding: 'utf8' },
);

console.log(
  'STAGE_16_3_SOURCE_PATCHED',
);
console.log(
  'REQUEST_ID_MIDDLEWARE_CREATED',
);
console.log(
  'MAIN_MIDDLEWARE_REGISTERED',
);
console.log(
  'NO_REQUEST_BODY_LOGGING_ADDED',
);
console.log(
  'NO_AUTHORIZATION_LOGGING_ADDED',
);
