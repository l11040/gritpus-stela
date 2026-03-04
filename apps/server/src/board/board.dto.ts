import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsArray, IsDateString, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CardPriority } from './entities/card.entity';

export class CreateBoardDto {
  @ApiProperty({ example: '스프린트 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBoardDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateColumnDto {
  @ApiProperty({ example: 'To Do' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateColumnDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}

export class ReorderDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}

export class CreateCardDto {
  @ApiProperty({ example: '회의록 정리' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUUID()
  columnId: string;

  @ApiPropertyOptional({ enum: CardPriority })
  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  labelIds?: string[];
}

export class UpdateCardDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: CardPriority })
  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  labelIds?: string[];
}

export class MoveCardDto {
  @ApiProperty()
  @IsUUID()
  columnId: string;

  @ApiProperty()
  @IsInt()
  position: number;
}

export class BatchCreateCardDto {
  @ApiProperty({ type: [CreateCardDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCardDto)
  cards: CreateCardDto[];
}

export class CreateLabelDto {
  @ApiProperty({ example: '긴급' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#EF4444' })
  @IsString()
  @IsNotEmpty()
  color: string;
}

export class UpdateLabelDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}

// 외부 JSON API용 DTO
export class ExternalCardItemDto {
  @ApiProperty({ example: '회의록 정리' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: CardPriority, default: CardPriority.MEDIUM })
  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsString()
  @IsOptional()
  assigneeEmail?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'To Do' })
  @IsString()
  @IsOptional()
  columnName?: string;
}

export class ExternalBatchCreateDto {
  @ApiProperty({ description: '보드 ID' })
  @IsUUID()
  boardId: string;

  @ApiProperty({ type: [ExternalCardItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalCardItemDto)
  items: ExternalCardItemDto[];
}
