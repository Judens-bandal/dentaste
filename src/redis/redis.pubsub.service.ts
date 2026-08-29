import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from './redis-con.module';
import { notificationBroadcast } from './redis.channels';
import { WebsocketService } from '../websocket/websocket.service';
import { userRoom } from '../websocket/common/websocket.rooms';

export interface INotificationPayload {
  id: string;
  type: null;
  task_id: number;
  message: string;
  created_at: string;
}

@Injectable()
export class RedisPubSub implements OnApplicationBootstrap {
  private readonly logger = new Logger(RedisPubSub.name);

  constructor(
    private readonly websocket: WebsocketService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
  ) {}

  onApplicationBootstrap() {
    this.subscribeChannel();
  }

  publish(payload: INotificationPayload): void {
    try {
      void this.redis.publish(notificationBroadcast, JSON.stringify(payload));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`publish failed: ${msg}`);
    }
  }

  private subscribeChannel(): void {
    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === notificationBroadcast) {
        this.handleBroadcast(message);
      }
    });
  }

  private handleBroadcast(message: string): void {
    try {
      const server = this.websocket.getServer();
      if (!server) return;

      const data: INotificationPayload = JSON.parse(message);
      if (!data?.id) return;

      server.to(userRoom(data.id)).emit('notification', data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`handleBroadcast failed: ${msg}`);
    }
  }
}
