import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [DatabaseModule, AppointmentsModule],
})
export class AppModule {}
