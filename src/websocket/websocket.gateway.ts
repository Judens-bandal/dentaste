// import {
//   WebSocketGateway,
//   WebSocketServer,
//   OnGatewayInit,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   SubscribeMessage,
//   MessageBody,
//   ConnectedSocket,
// } from '@nestjs/websockets';
// import { Logger } from '@nestjs/common';
// import { Server, Socket } from 'socket.io';

// @WebSocketGateway({
//   cors: { origin: '*' },
//   namespace: '/notifications',
// })
// export class WebsocketGateway
//   implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer()
//   server: Server;

//   private readonly logger = new Logger(WebsocketGateway.name);

//   afterInit() {
//     this.logger.log('WebSocket gateway initialized');
//   }

//   handleConnection(client: Socket) {
//     this.logger.log(`Client connected: ${client.id}`);
//   }

//   handleDisconnect(client: Socket) {
//     this.logger.log(`Client disconnected: ${client.id}`);
//   }

//   @SubscribeMessage('join_room')
//   handleJoinRoom(
//     @MessageBody() room: string,
//     @ConnectedSocket() client: Socket,
//   ) {
//     void client.join(room);
//     this.logger.log(`Client ${client.id} joined room: ${room}`);
//   }

//   @SubscribeMessage('leave_room')
//   handleLeaveRoom(
//     @MessageBody() room: string,
//     @ConnectedSocket() client: Socket,
//   ) {
//     void client.leave(room);
//     this.logger.log(`Client ${client.id} left room: ${room}`);
//   }

//   broadcast(event: string, data: unknown) {
//     this.server.emit(event, data);
//   }

//   broadcastToRoom(room: string, event: string, data: unknown) {
//     this.server.to(room).emit(event, data);
//   }
// }

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebsocketService } from './websocket.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    @Inject(forwardRef(() => WebsocketService))
    private readonly websocketService: WebsocketService,
  ) {}

  afterInit(server: Server) {
    this.websocketService.setServer(server);
    this.logger.log(
      'WebSocket gateway initialized on namespace: /notifications',
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    return this.websocketService.handleConnection(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    return this.websocketService.handleDisconnect(client);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
  }

  sendPermissionsUpdate(
    userId: string,
    newPermissions: string[],
    freshToken: string,
  ) {
    this.server.to(`user_${userId}`).emit('permissions_updated', {
      permissions: newPermissions,
      accessToken: freshToken,
    });
  }

  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  broadcastToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }
}
