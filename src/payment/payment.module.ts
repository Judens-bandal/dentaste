import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entity/payment';

@Module({
  imports: [TypeOrmModule.forFeature([Payment], 'main_repo')],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
