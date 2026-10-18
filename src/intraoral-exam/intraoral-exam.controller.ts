import {
  Body,
  Controller,
  Get,
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
  CreateIntraoralExamDto,
  GetIntraoralExamDto,
} from './dto/intraoral-exam';
import type { ICustomRequest } from '../../utils/common.interface';
import { Permission } from '../../common/commons/decorator/permissions.decorator';
import { EPermissions, ERole } from '../../utils/common.enum';
import { Roles } from '../../common/commons/decorator/roles.decorator';
import { Public } from '../../common/commons/decorator/jwt.decorator';

@ApiBearerAuth()
@Controller('intraoral-exams')
export class IntraoralExamController {
  constructor(private readonly intraoralExamService: IntraoralExamService) {}
  @Get('total')
  // @Roles(ERole.DOCTOR, ERole.ASSISTANT)
  // @Permission(EPermissions.VIEW_PATIENTS)
  @Public()
  async getTotal(@Req() req: ICustomRequest, @Res() res: Response) {
    await this.intraoralExamService.getTotal(req, res);
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
