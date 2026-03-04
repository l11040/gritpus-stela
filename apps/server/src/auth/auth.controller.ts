import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  AuthResponseDto,
  UserProfileDto,
  UpdateProfileDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApproveUserDto,
  ChangeUserRoleDto,
  AdminUserListDto,
} from './auth.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입 (관리자 승인 필요)' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: '인증 실패' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '토큰 갱신' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@CurrentUser() user: CurrentUserPayload): Promise<AuthResponseDto> {
    return this.authService.refresh(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  getProfile(@CurrentUser() user: CurrentUserPayload): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로필 수정' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'API Key 생성' })
  @ApiResponse({ status: 201, type: ApiKeyResponseDto })
  createApiKey(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.authService.createApiKey(user.id, dto);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'API Key 목록 조회' })
  listApiKeys(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.listApiKeys(user.id);
  }

  @Delete('api-keys/:keyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'API Key 비활성화' })
  @ApiResponse({ status: 200, description: '비활성화 완료' })
  revokeApiKey(
    @CurrentUser() user: CurrentUserPayload,
    @Param('keyId') keyId: string,
  ): Promise<void> {
    return this.authService.revokeApiKey(user.id, keyId);
  }

  // ── Admin: 사용자 관리 ──

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 전체 사용자 목록' })
  @ApiResponse({ status: 200, type: [AdminUserListDto] })
  listUsers(@CurrentUser() user: CurrentUserPayload): Promise<AdminUserListDto[]> {
    return this.authService.listUsers(user.id);
  }

  @Patch('admin/users/:userId/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 사용자 승인/거절' })
  @ApiResponse({ status: 200, description: '승인 상태 변경 완료' })
  approveUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId') userId: string,
    @Body() dto: ApproveUserDto,
  ): Promise<void> {
    return this.authService.approveUser(user.id, userId, dto);
  }

  @Patch('admin/users/:userId/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 사용자 역할 변경' })
  @ApiResponse({ status: 200, description: '역할 변경 완료' })
  changeUserRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId') userId: string,
    @Body() dto: ChangeUserRoleDto,
  ): Promise<void> {
    return this.authService.changeUserRole(user.id, userId, dto.role as UserRole);
  }

  @Delete('admin/users/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 사용자 삭제' })
  @ApiResponse({ status: 200, description: '삭제 완료' })
  deleteUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.authService.deleteUser(user.id, userId);
  }
}
