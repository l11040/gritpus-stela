import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { WeeklyWorkEntryType, WeeklyWorkInputType } from './entities/weekly-work-history.entity';

export class GenerateWeeklyWorkDto {
  @ApiProperty({ enum: WeeklyWorkEntryType, description: '생성 타입 (계획/보고)' })
  @IsEnum(WeeklyWorkEntryType)
  type: WeeklyWorkEntryType;

  @ApiProperty({ enum: WeeklyWorkInputType, description: '입력 형태 (채팅/음성)' })
  @IsEnum(WeeklyWorkInputType)
  inputType: WeeklyWorkInputType;

  @ApiProperty({ description: '사용자 입력 원문 (음성은 인식된 텍스트)' })
  @IsString()
  sourceText: string;

  @ApiPropertyOptional({ description: '기준 주 시작일 (월요일, YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @ApiPropertyOptional({ description: '보고 생성 시 참조할 계획 히스토리 ID' })
  @IsOptional()
  @IsUUID()
  planReferenceId?: string;

  @ApiPropertyOptional({ description: '동일 주차/타입 문서가 있으면 덮어쓰기 여부 (기본값: true)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  overwriteExisting: boolean = true;

  @ApiPropertyOptional({ description: 'true면 미리보기만 생성하고 DB에는 저장하지 않음 (기본값: false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return false;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  previewOnly: boolean = false;

  @ApiPropertyOptional({ description: '저장 시 생성 결과 대신 사용할 최종 Markdown (선택)' })
  @IsOptional()
  @IsString()
  markdownOverride?: string;

  @ApiProperty({ description: '프로젝트 ID' })
  @IsUUID()
  projectId: string;
}

export class WeeklyWorkHistoryQueryDto {
  @ApiPropertyOptional({ enum: WeeklyWorkEntryType })
  @IsOptional()
  @IsEnum(WeeklyWorkEntryType)
  type?: WeeklyWorkEntryType;

  @ApiPropertyOptional({ description: '기준 주 시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @ApiPropertyOptional({ description: '조회 대상 사용자 ID (생략 시 본인)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '전체 사용자 히스토리 조회 여부 (true/false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeAllUsers?: boolean;

  @ApiPropertyOptional({ description: '프로젝트 ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class WeeklyWorkUsersQueryDto {
  @ApiPropertyOptional({ description: '기준 주 시작일 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  weekStartDate?: string;
}

export class WeeklyWorkUserSummaryDto {
  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '사용자 이름' })
  name: string;

  @ApiProperty({ description: '사용자 이메일' })
  email: string;

  @ApiProperty({ description: '조회 기준 주에 계획 존재 여부' })
  hasPlan: boolean;

  @ApiProperty({ description: '조회 기준 주에 보고 존재 여부' })
  hasReport: boolean;

  @ApiProperty({ description: '현재 로그인 사용자 여부' })
  isMe: boolean;
}

export class UpdateWeeklyHistoryDto {
  @ApiProperty({ description: '사용자가 수정한 Markdown 본문' })
  @IsString()
  markdown: string;
}

export class CreateWeeklyWorkProjectDto {
  @ApiProperty({ description: '프로젝트 이름' })
  @IsString()
  name: string;
}
