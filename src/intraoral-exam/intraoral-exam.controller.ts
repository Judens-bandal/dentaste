import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { IntraoralExamService } from './intraoral-exam.service';
import {
  UpsertToothRecordDto,
  GetToothRecordsDto,
  CreateIntraoralExamDto,
  GetIntraoralExamDto,
} from './dto/intraoral-exam';
import type { ICustomRequest } from '../../utils/common.interface';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';

@ApiBearerAuth()
@Controller('intraoral-exams')
export class IntraoralExamController {
  constructor(private readonly intraoralExamService: IntraoralExamService) {}

  @Get('tooth-records')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_PATIENTS)
  async getToothRecords(
    @Query() dto: GetToothRecordsDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.intraoralExamService.getToothRecords(dto, req, res);
  }

  @Put('tooth-records/upsert')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async upsertToothRecord(
    @Body() dto: UpsertToothRecordDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.intraoralExamService.upsertToothRecord(dto, req, res);
  }

  @Get()
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.VIEW_PATIENTS)
  async getExams(
    @Query() dto: GetIntraoralExamDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.intraoralExamService.getExams(dto, req, res);
  }

  @Post('create')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async createExam(
    @Body() dto: CreateIntraoralExamDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.intraoralExamService.createExam(dto, req, res);
  }

  @Delete(':id')
  @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  @Permission(EPermissions.MANAGE_PATIENTS)
  async deleteExam(
    @Param('id') id: string,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    await this.intraoralExamService.deleteExam(id, req, res);
  }
}
