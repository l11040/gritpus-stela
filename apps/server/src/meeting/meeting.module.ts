import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';
import { MeetingAiService } from './meeting-ai.service';
import { MeetingProgressService } from './meeting-progress.service';
import { MeetingAgentService } from './ai/meeting-agent.service';
import { AssigneeResolverService } from './ai/assignee-resolver.service';
import { MeetingSummaryService } from './ai/meeting-summary.service';
import { MeetingMinutes } from './entities/meeting-minutes.entity';
import { BoardColumn } from '../board/entities/column.entity';
import { DocumentModule } from '../document/document.module';
import { BoardModule } from '../board/board.module';
import { ProjectModule } from '../project/project.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingMinutes, BoardColumn]),
    DocumentModule,
    BoardModule,
    ProjectModule,
    NotificationModule,
  ],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingAiService,
    MeetingProgressService,
    MeetingAgentService,
    AssigneeResolverService,
    MeetingSummaryService,
  ],
})
export class MeetingModule {}
