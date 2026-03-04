import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ProjectRole } from './entities/project-member.entity';

export class CreateProjectDto {
  @ApiProperty({ example: '주간 회의 프로젝트' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '매주 월요일 회의 기반 태스크 관리' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  role: ProjectRole;
}
