import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMdDocumentDto {
  @ApiProperty({ example: 'API 설계 문서' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '마크다운 본문 (파일 업로드 대신 직접 입력)' })
  @IsString()
  @IsOptional()
  content?: string;
}

export class UpdateMdDocumentDto {
  @ApiPropertyOptional({ example: '수정된 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '마크다운 본문' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '버전 변경 메모' })
  @IsString()
  @IsOptional()
  changeNote?: string;
}
