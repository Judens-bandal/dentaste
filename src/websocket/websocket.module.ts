import { forwardRef, Module } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { WebsocketController } from './websocket.controller';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/common/entity/user';
import { WebsocketGateway } from './websocket.gateway';
import { RedisPubSub } from '../redis/redis.pubsub.service';
import { NotificationHelper } from '../notification/common/notification.helper';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([User], 'main_repo'),
  ],
  providers: [
    WebsocketGateway,
    WebsocketService,
    RedisPubSub,
    NotificationHelper,
  ],
  // controllers: [WebsocketController],
  exports: [WebsocketService, RedisPubSub, NotificationHelper],
})
export class WebsocketModule {}
