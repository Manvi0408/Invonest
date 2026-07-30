import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Stash the raw request bytes on req.rawBody so webhook handlers can verify
  // provider HMAC signatures against the exact payload (JSON.stringify would
  // re-serialize and break the signature).
  app.use(
    json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`InvoNest Core API backend is running on: http://localhost:${port}/api`);
}
bootstrap();
