import { Body, Controller, Get, Param, Put, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { UpsertToothRecordDto } from './dto/tooth-record';
import { ICustomRequest } from '../../utils/common.interface';
import { ToothRecordsService } from './tooth-records.service';

@Controller('tooth-records')
export class ToothRecordsController {
  constructor(private readonly toothRecordService: ToothRecordsService) {}

  @Get('patient/:patient_id')
  async getByPatient(
    @Param('patient_id') patient_id: string,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return this.toothRecordService.getByPatient(
      { patient_id: patient_id },
      req,
      res,
    );
  }

  @Put('upsert')
  async upsert(
    @Body() dto: UpsertToothRecordDto,
    @Req() req: ICustomRequest,
    @Res() res: Response,
  ) {
    return this.toothRecordService.upsert(dto, req, res);
  }
}
