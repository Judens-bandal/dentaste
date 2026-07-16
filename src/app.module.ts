import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';

import { HealthModule } from './health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';

import { PatientModule } from './patient/patient.module';
import { RolesGuard } from '../common/commons/guards/roles.guard';
import { PermissionGuard } from '../common/commons/guards/permission.guard';
import { AppThrottlerGuard } from '../common/commons/guards/rate.limiter';
import { PaymentModule } from './payment/payment.module';
import { AppointmentModule } from './appointment/appointment.module';

@Module({
  imports: [
    DatabaseModule,
    AppointmentModule,
    AuthModule,
    HealthModule,
    ScheduleModule,

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

    PatientModule,

    PaymentModule,
  ],

  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
