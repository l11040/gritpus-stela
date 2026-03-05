import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsDateString, IsBoolean, IsEnum } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class LoginResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  profileImageUrl: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isApproved: boolean;
}

export class RegisterResponseDto {
  @ApiProperty()
  message: string;
}

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  profileImageUrl: string | null;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isApproved: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '김철수' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileImageUrl?: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'External Service Key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  expiresAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class ApproveUserDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved: boolean;
}

export class ChangeUserRoleDto {
  @ApiProperty({ enum: ['admin', 'user'], example: 'admin' })
  @IsEnum(['admin', 'user'])
  role: 'admin' | 'user';
}

export class AdminUserListDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isApproved: boolean;

  @ApiProperty()
  createdAt: Date;
}
