import { Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entity/patient';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient], 'main_repo'),
    AuthModule,
    WebsocketModule,
  ],
  providers: [PatientService],
  controllers: [PatientController],
})
export class PatientModule {}
