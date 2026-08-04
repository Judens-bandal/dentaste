import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { User } from '../auth/common/entity/user';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { UsersService } from './users.service';
import { RedisConModule } from '../redis/redis-con.module';
import { NotificationModule } from '../notification/notification.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WebsocketService } from '../websocket/websocket.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User], 'main_repo'),
    AuthModule,
    RedisConModule,
    WebsocketModule,
    NotificationModule,
  ],
  providers: [WebsocketGateway, WebsocketService, UsersService],
  controllers: [UsersController],
  exports: [WebsocketGateway, WebsocketService],
})
export class UsersModule {}
