import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger Configuration — only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AssetsUp API')
      .setDescription('Asset management platform API documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      jsonDocumentUrl: 'api/docs-json',
    });
  }

  const port = process.env.PORT ?? 6003;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
