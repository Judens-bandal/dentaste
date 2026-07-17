import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ErrorCode } from '../utils/common.enum';
import { TransformInterceptor } from '../common/commons/interceptors/transform.interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
