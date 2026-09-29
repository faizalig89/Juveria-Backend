import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app =
    await NestFactory.create(AppModule);

  const requestContextMiddleware =
    new RequestContextMiddleware();

  app.use(
    requestContextMiddleware.use.bind(
      requestContextMiddleware,
    ),
  );

  app.use(helmet());

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(env.port);
}

await bootstrap();
