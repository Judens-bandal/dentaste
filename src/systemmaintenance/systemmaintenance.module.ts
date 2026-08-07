import { Module } from '@nestjs/common';
import { SystemmaintenanceService } from './systemmaintenance.service';
import { SystemmaintenanceController } from './systemmaintenance.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WebsocketService } from '../websocket/websocket.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [WebsocketModule, AuthModule],
  providers: [SystemmaintenanceService, WebsocketGateway, WebsocketService],
  controllers: [SystemmaintenanceController],
  exports: [SystemmaintenanceService],
})
export class SystemmaintenanceModule {}
