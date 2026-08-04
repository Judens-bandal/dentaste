import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  GetPaymentDto,
  GetTotalPaymentsDto,
} from './dto/payment';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Cron } from '@nestjs/schedule';
import { Roles } from '../../common/commons/decorator/roles.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/add')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PAYMENTS)
  async create(
    @Body() dto: CreatePaymentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.createPayment(dto, req, res);
  }

  @Get('/total')
  @Roles(ERole.DOCTOR)
  @Permission(EPermissions.VIEW_PAYMENTS_TOTAL)
  async getTotalReceivedPayments(
    @Query() dto: GetTotalPaymentsDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.getTotalReceivedPayments(dto, req, res);
  }

  @Get()
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_PAYMENTS)
  async getPayments(
    dto: GetPaymentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.paymentService.getPayments(dto, req, res);
  }

  // @Cron('*/5 * * * * *')
  async refreshPaymentsCacheJob() {
    // calls the DEDICATED cache-refresh method — NOT getPayments()
    await this.paymentService.refreshPaymentsCache();
  }
}
