import { Controller, Post, Get, UseGuards } from '@nestjs/common';

import { ScheduleService } from './schedule.service';
import { RolesGuard } from '../../common/commons/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('status')
  //   @Public()
  getStatus() {
    return this.scheduleService.getJobStatus();
  }

  @Post('trigger')
  //   @Public()
  triggerJob() {
    this.scheduleService.handleCron();
    return { message: 'Schedule job triggered manually' };
  }
}
