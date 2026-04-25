import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function env(name: string, fallback: string): string {
  const globalEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return globalEnv?.[name] || fallback;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: env('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const uploadDest = env('UPLOAD_DEST', 'uploads');
  app.useStaticAssets(uploadDest, { prefix: '/uploads' });

  const port = Number(env('PORT', '6003'));
  await app.listen(port);
}

bootstrap();
