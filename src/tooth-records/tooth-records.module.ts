import { Module } from '@nestjs/common';
import { ToothRecordsService } from './tooth-records.service';
import { ToothRecordsController } from './tooth-records.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToothRecord } from './entity/tooth-record';
import { AuthModule } from 'src/auth/auth.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ToothRecord], 'main_repo'),
    AuthModule,
    WebsocketModule,
  ],
  providers: [ToothRecordsService],
  controllers: [ToothRecordsController],
  exports: [ToothRecordsService],
})
export class ToothRecordsModule {}
