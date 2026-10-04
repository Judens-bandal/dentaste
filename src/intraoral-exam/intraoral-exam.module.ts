import { Module } from '@nestjs/common';
import { IntraoralExamService } from './intraoral-exam.service';
import { IntraoralExamController } from './intraoral-exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntraoralExam } from './entity/intraoral-exam';
import { Appointment } from '../appointment/entity/appointment';
import { AuthModule } from 'src/auth/auth.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntraoralExam, Appointment], 'main_repo'),
    AuthModule,
    WebsocketModule,
  ],
  providers: [IntraoralExamService],
  controllers: [IntraoralExamController],
})
export class IntraoralExamModule {}
