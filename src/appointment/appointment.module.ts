import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entity/appointment';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment], 'main_repo')],
  providers: [AppointmentService],
  controllers: [AppointmentController],
})
export class AppointmentModule {}
