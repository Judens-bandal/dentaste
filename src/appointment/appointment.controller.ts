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
import { EPermissions, ERole } from '../../utils/common.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/commons/decorator/roles.decorator';

@ApiBearerAuth()
@Controller('appointments')
export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  @Get()
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_APPOINTMENTS)
  async getAllAppointments(
    dto: GetAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.getAllAppointments(dto, req, res);
  }

  @Post('/create')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  async addAppointment(
    @Body() dto: CreateAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.addAppointment(dto, req, res);
  }

  @Put('/update')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  async updateAppointment(
    @Body() dto: UpdateAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.updateAppointment(dto, req, res);
  }

  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  @Delete('/delete')
  async deleteAppointment(
    @Body() dto: DeleteAppointmentDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.deleteAppointment(dto, req, res);
  }

  @Patch('status')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_APPOINTMENTS)
  async updateAppointmentStatus(
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return await this.appointmentService.updateAppointmentStatus(dto, req, res);
  }
}
