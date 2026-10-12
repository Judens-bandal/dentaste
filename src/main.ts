import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ErrorCode } from '../utils/common.enum';
import { TransformInterceptor } from '../common/commons/interceptors/transform.interceptors';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { safeParser } from '../utils/common.helper';
import * as fs from 'fs';
import * as path from 'path';

export let versionBump: { version: any; env: string | undefined } | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cors = {
    origin: ['https://dentaste-fe.vercel.app', 'http://localhost:3000'],
    // origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    // exposedHeaders: ['x-auth-token']
    // allowedHeaders: ['Content-Type'],
    // allowedHeaders: ['Content-Type', 'Authorization'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'ngrok-skip-browser-warning',
    ],
  };
  app.enableCors(cors);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true, // ← must be true
      transformOptions: {
        enableImplicitConversion: true, // ← add this
      },
      exceptionFactory: (errors) => {
        const messages = errors
          .map((err) => Object.values(err.constraints || {}))
          .flat();

        throw new BadRequestException({
          code: ErrorCode.DTO_VALIDATION_ERROR,
          error: 'Bad Request',
          message: messages,
          statusCode: 400,
        });
      },
    }),
  );

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Lorem API')
    .setDescription(
      ' Lorem ipsum dolor sit amet, consectetur adipisicing elit. Delectus quas esse sint, accusamus quasi asperiores, perspiciatis harum ut similique voluptatibus cumque nisi molestias ex, excepturi id. Minima nulla distinctio veritatis.',
    )
    .setVersion('1.0')
    .build();

  // Swagger Document Options
  const options: SwaggerDocumentOptions = {
    // Include specific modules (optional)
    // include: [TasksModule, UsersModule],

    // Extra models that might not be auto-detected
    // extraModels: [YourResponseDto, PaginationDto],

    ignoreGlobalPrefix: false,
    deepScanRoutes: true, // Recommended: scans imported modules too
    autoTagControllers: true, // Auto-generates tags from controller names

    // Custom operation ID (cleaner than default)
    operationIdFactory: (
      controllerKey: string,
      methodKey: string,
      version?: string,
    ) => `${controllerKey}_${methodKey}`,
  };

  // Create document with options
  const document = SwaggerModule.createDocument(app, config, options);

  // === Export Swagger JSON file ===

  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: 'api-json', // Access full JSON at /api-json
    yamlDocumentUrl: 'api-yaml', // Optional: YAML version
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  const env = process.env.ENVIRONMENT;
  versionBump = { version: 'N/A', env: env };

  try {
    const versionPath = path.join(__dirname, 'assets', 'version.json');

    if (fs.existsSync(versionPath)) {
      const raw = fs.readFileSync(versionPath, 'utf8').trim();
      const data = safeParser<any>(raw);

      versionBump = { version: data?.bump?.version ?? 'N/A', env: env };
    }
  } catch (error) {
    versionBump = { version: 'N/A', env: env };
  }

  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
