import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { configValidationSchema } from './config.schema';

// Import your entities here
import { User } from '../../src/auth/common/entity/user';
import { Patient } from '../../src/patient/entity/patient';
import { Appointment } from '../../src/appointment/entity/appointment';
import { Payment } from '../../src/payment/entity/payment';
import { IntraoralExam } from 'src/intraoral-exam/entity/intraoral-exam';
// Add more entities later: Patient, Appointment, Notification, etc.

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env',
        `.env.stage.${process.env.STAGE || 'prod'}`,
        `.env.${process.env.PROD || 'prod'}`,
      ],
      validationSchema: configValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'main_repo', // Keep this if you want named connection
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        autoLoadEntities: true,
        // synchronize: f, // Set to false in production for safety
        // logging: configService.get<string>('NODE_ENV') === 'development',

        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // url: configService.get<string>('DATABASE_URL'),
        timeZone: 'Z',

        ssl: {
          rejectUnauthorized: false,
        },

        extra: {
          max: 20,
          connectionTimeoutMillis: 10000,
        },

        entities: [User, Patient, Appointment, Payment, IntraoralExam], // Add all your entities here
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService], // Export TypeOrmModule too
})
export class DatabaseModule {}
