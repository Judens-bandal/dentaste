import { Module } from '@nestjs/common';
import { IntraoralExamService } from './intraoral-exam.service';
import { IntraoralExamController } from './intraoral-exam.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntraoralExam } from './entity/intraoral-exam';
import { AuthModule } from 'src/auth/auth.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntraoralExam], 'main_repo'),
    AuthModule,
    WebsocketModule,
  ],
  providers: [IntraoralExamService],
  controllers: [IntraoralExamController],
})
export class IntraoralExamModule {}
