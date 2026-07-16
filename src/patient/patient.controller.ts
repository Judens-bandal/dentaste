import { Body, Controller, Post, Req, Res } from '@nestjs/common';

import { CreatePatientDto } from './dto/patient';
import type { ICustomRequest } from '../../utils/common.interface';
import type { Response } from 'express';
import { PatientService } from './patient.service';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('/create')
  @Permission(EPermissions.MANAGE_PATIENTS)
  //   @Roles(ERole.ADMIN)
  async createPatient(
    @Body() dto: CreatePatientDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.patientService.addPatient(dto, req, res);
  }
}
