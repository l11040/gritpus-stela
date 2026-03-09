import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '../chat/chat.module';
import { User } from '../auth/entities/user.entity';
import { WeeklyWorkController } from './weekly-work.controller';
import { WeeklyWorkService } from './weekly-work.service';
import { WeeklyWorkHistory } from './entities/weekly-work-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklyWorkHistory, User]),
    ChatModule,
  ],
  controllers: [WeeklyWorkController],
  providers: [WeeklyWorkService],
})
export class WeeklyWorkModule {}
