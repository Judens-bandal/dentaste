import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './commons/guards/roles.guard';
import { PermissionGuard } from './commons/guards/permission.guard';

@Module({
  imports: [DatabaseModule, AppointmentsModule, AuthModule],

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
  ],
})
export class AppModule {}
