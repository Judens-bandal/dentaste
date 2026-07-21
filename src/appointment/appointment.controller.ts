import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  DeleteAppointmentDto,
  GetAppointmentDto,
  UpdateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions } from '../../utils/common.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
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

  @Put('/update')
  async updateAppointment(
    @Body() dto: UpdateAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.updateAppointment(dto, req, res);
  }

  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  @Delete('/delete')
  async deleteAppointment(
    @Query() dto: DeleteAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.deleteAppointment(dto, req, res);
  }
  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  @Patch('status')
  async updateAppointmentStatus(
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.updateAppointmentStatus(dto, req, res);
  }
}
