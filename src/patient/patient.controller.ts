import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';

import {
  CreatePatientDto,
  GetPatientDto,
  UpdatePatientDto,
} from './dto/patient';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';
import { PatientService } from './patient.service';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';
import { DeleteAppointmentDto } from '../appointment/dto/appointment';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/commons/decorator/jwt.decorator';
import { SkipMaintenance } from '../systemmaintenance/common/decorators/skip-maintenance.decorator';
@ApiBearerAuth()
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Public()
  @Get('/total')
  @SkipMaintenance()

  // @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  // @Permission(EPermissions.VIEW_PATIENTS)
  async getTotalPatients(@Req() req: ICustomRequest, @Res() res: Response) {
    await this.patientService.getTotalPatients(req, res);
  }
  @Get()
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_PATIENTS)
  async getAllPatients(
    @Query() dto: GetPatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.getAllPatients(dto, req, res);
  }

  @Get('/record')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_PATIENTS)
  async getPatientRecord(
    @Query() dto: GetPatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.getPatientRecord(dto, req, res);
  }

  @Post('/create')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async createPatient(
    @Body() dto: CreatePatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.addPatient(dto, req, res);
  }

  @Put('/update')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async updatePatient(
    @Body() dto: UpdatePatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.updatePatient(dto, req, res);
  }

  @Delete('/delete')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async deletePatient(
    @Query() dto: GetPatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.deletePatient(dto, req, res);
  }
}
