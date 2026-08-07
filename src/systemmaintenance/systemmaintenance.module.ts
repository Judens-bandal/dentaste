import { Module } from '@nestjs/common';
import { SystemmaintenanceService } from './systemmaintenance.service';
import { SystemmaintenanceController } from './systemmaintenance.controller';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { APP_GUARD } from '@nestjs/core';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  // providers: [SystemmaintenanceService],
  providers: [
    WebsocketModule,
    SystemmaintenanceService,
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
  // exports: [SystemmaintenanceService],
  controllers: [SystemmaintenanceController],
  exports: [SystemmaintenanceService],
})
export class SystemmaintenanceModule {}
