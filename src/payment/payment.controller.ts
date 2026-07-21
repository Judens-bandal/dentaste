import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/payment';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/add')
  async create(
    @Body() dto: CreatePaymentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.createPayment(dto, req, res);
  }
}
