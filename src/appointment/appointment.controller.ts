import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto, GetAppointmentDto } from './dto/appointment';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';

@Controller('appointments')
export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  @Get()
  async getAllAppointments(
    dto: GetAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.getAllAppointments(dto, req, res);
  }

  @Post('/create')
  async addAppointment(
    @Body() dto: CreateAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.addAppointment(dto, req, res);
  }
}
