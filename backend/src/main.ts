import { existsSync } from 'fs';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const appOrigin = process.env.APP_ORIGIN;
  if (isProduction) {
    if (!process.env.DATABASE_URL || !process.env.APP_PASSWORD_HASH || !appOrigin) {
      throw new Error('Production requires DATABASE_URL, APP_PASSWORD_HASH, and APP_ORIGIN.');
    }
    if (new URL(appOrigin).protocol !== 'https:') {
      throw new Error('APP_ORIGIN must use HTTPS in production.');
    }
  }

  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  if (isProduction) expressApp.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: isProduction
          ? ["'self'"]
          : ["'self'", 'http://localhost:3000', 'http://localhost:5173', 'ws://localhost:5173'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: isProduction ? { maxAge: 15_552_000, includeSubDomains: true } : false,
  }));
  app.use(cookieParser());

  // Limite augmentée pour les photos en base64 (analyse IA)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  const allowedOrigins = isProduction
    ? [appOrigin]
    : [appOrigin, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
  app.enableCors({ origin: isProduction ? allowedOrigins : true, credentials: true });
  app.use((request, response, next) => {
    const origin = request.get('origin');
    let isAllowedOrigin = !origin || allowedOrigins.includes(origin);
    if (origin && !isProduction && !isAllowedOrigin) {
      try {
        const parsedOrigin = new URL(origin);
        isAllowedOrigin =
          parsedOrigin.protocol === `${request.protocol}:` &&
          parsedOrigin.hostname === request.hostname;
      } catch {
        isAllowedOrigin = false;
      }
    }
    if (!isAllowedOrigin) {
      return response.status(403).json({ message: 'Origine non autorisée' });
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Operation10 API')
      .setDescription('API du projet Operation10 — Rennes')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const publicDir = join(__dirname, '..', 'public');
  const indexFile = join(publicDir, 'index.html');
  if (existsSync(indexFile)) {
    expressApp.use(require('express').static(publicDir, { index: false }));
    expressApp.use((request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api') || request.path.includes('.')) {
        return next();
      }
      response.sendFile(indexFile);
    });
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Backend démarré sur http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
