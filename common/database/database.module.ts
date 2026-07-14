// src/database/database.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { Module } from '@nestjs/common';
import { configValidationSchema } from 'common/database/config.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.stage.${process.env.STAGE}`],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'main_repo',
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        autoLoadEntities: true,
        synchronize: false,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT')!,
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
