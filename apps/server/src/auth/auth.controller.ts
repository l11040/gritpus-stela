import { Controller, Post, Get, Patch, Delete, Body, Param, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterResponseDto,
  LoginDto,
  LoginResponseDto,
  UserProfileDto,
  UpdateProfileDto,
  ChangePasswordDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApproveUserDto,
  ChangeUserRoleDto,
  AdminUserListDto,
} from './auth.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15분
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.secureCookie = configService.get<string>('COOKIE_SECURE', 'false') === 'true';
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.secureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입 (관리자 승인 필요)' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신 (쿠키 기반)' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: '유효하지 않은 리프레시 토큰' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return result.user;
  }

  @Post('logout')
  @ApiOperation({ summary: '로그아웃' })
  @ApiResponse({ status: 200, description: '로그아웃 완료' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    this.clearAuthCookies(res);
    return { message: '로그아웃되었습니다.' };
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

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 완료' })
  @ApiResponse({ status: 401, description: '현재 비밀번호 불일치' })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto);
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

  @Post('admin/users/:userId/reset-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 사용자 비밀번호 초기화 (qwer1234@)' })
  @ApiResponse({ status: 200, description: '비밀번호 초기화 완료' })
  @ApiResponse({ status: 403, description: '관리자 권한 필요' })
  resetUserPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.authService.resetUserPassword(user.id, userId);
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
