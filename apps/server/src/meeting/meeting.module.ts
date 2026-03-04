import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { MeetingAiService } from './meeting-ai.service';
import { MeetingMinutes } from './entities/meeting-minutes.entity';
import { BoardColumn } from '../board/entities/column.entity';
import { DocumentModule } from '../document/document.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingMinutes, BoardColumn]),
    DocumentModule,
    BoardModule,
  ],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingAiService],
})
export class MeetingModule {}
