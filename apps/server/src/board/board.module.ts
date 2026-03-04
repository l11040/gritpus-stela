import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardController, LabelController, ExternalController } from './board.controller';
import { BoardService } from './board.service';
import { Board } from './entities/board.entity';
import { BoardColumn } from './entities/column.entity';
import { Card } from './entities/card.entity';
import { Label } from './entities/label.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Board, BoardColumn, Card, Label]),
    AuthModule,
  ],
  controllers: [BoardController, LabelController, ExternalController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
