import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../../common/commons/guards/roles.guard';
import { NotificationService } from './notification.service';
import { GetUser } from '../auth/common/get.user.decorator';
import { User } from '../auth/common/entity/user';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationsService: NotificationService) {}

  @Get()
  getAll(
    @GetUser() user: User,
    @Query('limit') limit?: number,
    // @Query('stream_id') stream_id?: string,
  ) {
    return this.notificationsService.getAll(
      user.id,
      limit ? Number(limit) : 20,
      // stream_id,
    );
  }

  @Get('count')
  getCount(@GetUser() user: User) {
    return this.notificationsService.getCount(user.id);
  }

  @Patch('read')
  markRead(@GetUser() user: User, @Body() body: { stream_id: string[] }) {
    return this.notificationsService.markRead(user.id, body.stream_id);
  }

  @Patch('read-all')
  markAllRead(@GetUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete()
  delete(@GetUser() user: User, @Body() body: { stream_id: string[] }) {
    return this.notificationsService.delete(user.id, body.stream_id);
  }
}
