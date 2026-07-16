import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entity/patient';

@Module({
  imports: [TypeOrmModule.forFeature([Patient], 'main_repo')],
  providers: [PatientService],
  controllers: [PatientController],
})
export class PatientModule {}
