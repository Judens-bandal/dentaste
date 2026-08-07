import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { HealthModule } from './health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { PatientModule } from './patient/patient.module';
import { RolesGuard } from '../common/commons/guards/roles.guard';
import { PermissionGuard } from '../common/commons/guards/permission.guard';
import { AppThrottlerGuard } from '../common/commons/guards/rate.limiter';
import { PaymentModule } from './payment/payment.module';
import { AppointmentModule } from './appointment/appointment.module';
import { JwtAuthGuard } from '../common/commons/guards/jwt-auth.guard';
import { NotificationModule } from './notification/notification.module';
import { RedisUtilModule } from './redis/redis-util.module';
import { LoggingInterceptor } from '../common/commons/interceptors/logging.interceptors';
import { WebsocketModule } from './websocket/websocket.module';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from '../common/database/config.schema';
import { UsersModule } from './users/users.module';
import { SystemmaintenanceModule } from './systemmaintenance/systemmaintenance.module';
import { MaintenanceGuard } from './systemmaintenance/common/guards/maintenance.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.stage.${process.env.STAGE}`],
      validationSchema: configValidationSchema,
      cache: true,
      expandVariables: true,
    }),
    DatabaseModule,
    AppointmentModule,
    AuthModule,
    HealthModule,
    ScheduleModule,

    PatientModule,

    PaymentModule,

    NotificationModule,

    RedisUtilModule,

    WebsocketModule,

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { name: 'short', ttl: 1000, limit: 5 }, // burst protection
          { name: 'medium', ttl: 10_000, limit: 30 }, // sustained-but-fast abuse
          { name: 'long', ttl: 60_000, limit: 150 }, // overall ceiling
        ],
        // storage: new ThrottlerStorageRedisService(
        //   new Redis({
        //     host: process.env.REDIS_HOST,
        //     port: Number(process.env.REDIS_PORT),
        //     password: process.env.REDIS_PASSWORD,
        //   }),
        // ),
      }),
    }),

    UsersModule,

    SystemmaintenanceModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
