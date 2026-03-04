import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from './entities/user.entity';
import { ApiKey } from './entities/api-key.entity';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UserProfileDto,
  UpdateProfileDto,
  CreateApiKeyDto,
  ApiKeyResponseDto,
  AdminUserListDto,
  ApproveUserDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password: hashed,
      name: dto.name,
      isApproved: false,
    });
    await this.userRepo.save(user);

    return { message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    if (!user.isApproved) {
      throw new ForbiddenException('관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.');
    }

    return this.generateTokens(user);
  }

  async refresh(userId: string): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user);
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      isApproved: user.isApproved,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async createApiKey(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    const key = `gst_${uuidv4().replace(/-/g, '')}`;
    const apiKey = this.apiKeyRepo.create({
      key,
      name: dto.name,
      userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    const saved = await this.apiKeyRepo.save(apiKey);
    return {
      id: saved.id,
      key: saved.key,
      name: saved.name,
      isActive: saved.isActive,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
    };
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKeyResponseDto, 'key'>[]> {
    const keys = await this.apiKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      isActive: k.isActive,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await this.apiKeyRepo.update({ id: keyId, userId }, { isActive: false });
  }

  // ── Admin: 사용자 관리 ──

  async assertAdmin(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }
  }

  async listUsers(adminId: string): Promise<AdminUserListDto[]> {
    await this.assertAdmin(adminId);
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isApproved: u.isApproved,
      createdAt: u.createdAt,
    }));
  }

  async approveUser(adminId: string, targetUserId: string, dto: ApproveUserDto): Promise<void> {
    await this.assertAdmin(adminId);
    await this.userRepo.update(targetUserId, { isApproved: dto.approved });
  }

  async deleteUser(adminId: string, targetUserId: string): Promise<void> {
    await this.assertAdmin(adminId);
    if (adminId === targetUserId) throw new ForbiddenException('자기 자신을 삭제할 수 없습니다.');
    await this.userRepo.delete(targetUserId);
  }

  async changeUserRole(adminId: string, targetUserId: string, role: UserRole): Promise<void> {
    await this.assertAdmin(adminId);
    await this.userRepo.update(targetUserId, { role });
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
