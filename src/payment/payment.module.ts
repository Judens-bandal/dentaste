import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entity/payment';
import { Patient } from '../patient/entity/patient';
import { WebsocketModule } from '../websocket/websocket.module';
import { Appointment } from '../appointment/entity/appointment';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Patient, Appointment], 'main_repo'),
    WebsocketModule,
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
