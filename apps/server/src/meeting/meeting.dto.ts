import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { CardPriority } from '../board/entities/card.entity';

export class CreateMeetingDto {
  @ApiProperty({ example: '2024-03-04 주간 회의' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '회의록 텍스트 내용 (파일 업로드 대신 직접 입력)' })
  @IsString()
  @IsOptional()
  rawContent?: string;
}

export class ParsedActionItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assigneeName?: string;

  @ApiPropertyOptional({ description: '매핑된 담당자 ID' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: CardPriority })
  @IsEnum(CardPriority)
  @IsOptional()
  priority?: CardPriority;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  suggestedLabels?: string[];
}

export class UpdatePreviewDto {
  @ApiProperty({ type: [ParsedActionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedActionItemDto)
  actionItems: ParsedActionItemDto[];
}

export class ConfirmMeetingDto {
  @ApiProperty({ description: '카드를 등록할 보드 ID' })
  @IsUUID()
  boardId: string;

  @ApiPropertyOptional({ description: '카드를 등록할 컬럼 ID (미지정 시 첫 번째 컬럼)' })
  @IsUUID()
  @IsOptional()
  columnId?: string;
}
