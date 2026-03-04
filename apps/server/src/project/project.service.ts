import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember, ProjectRole } from './entities/project-member.entity';
import { User } from '../auth/entities/user.entity';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, UpdateMemberRoleDto } from './project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepo.create(dto);
    const saved = await this.projectRepo.save(project);

    const member = this.memberRepo.create({
      projectId: saved.id,
      userId,
      role: ProjectRole.OWNER,
    });
    await this.memberRepo.save(member);

    return this.findOne(saved.id);
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    return this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('project.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'user')
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findOne(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['members', 'members.user', 'boards'],
    });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.assertRole(projectId, userId, [ProjectRole.OWNER, ProjectRole.ADMIN]);
    await this.projectRepo.update(projectId, dto);
    return this.findOne(projectId);
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.assertRole(projectId, userId, [ProjectRole.OWNER]);
    await this.projectRepo.delete(projectId);
  }

  async addMember(projectId: string, userId: string, dto: AddMemberDto): Promise<ProjectMember> {
    await this.assertRole(projectId, userId, [ProjectRole.OWNER, ProjectRole.ADMIN]);

    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('해당 이메일의 사용자를 찾을 수 없습니다.');

    const exists = await this.memberRepo.findOne({
      where: { projectId, userId: user.id },
    });
    if (exists) throw new ConflictException('이미 프로젝트 멤버입니다.');

    const member = this.memberRepo.create({
      projectId,
      userId: user.id,
      role: dto.role || ProjectRole.MEMBER,
    });
    return this.memberRepo.save(member);
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    return this.memberRepo.find({
      where: { projectId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<ProjectMember> {
    await this.assertRole(projectId, userId, [ProjectRole.OWNER, ProjectRole.ADMIN]);
    await this.memberRepo.update(memberId, { role: dto.role });
    return this.memberRepo.findOneOrFail({
      where: { id: memberId },
      relations: ['user'],
    });
  }

  async removeMember(projectId: string, userId: string, memberId: string): Promise<void> {
    await this.assertRole(projectId, userId, [ProjectRole.OWNER, ProjectRole.ADMIN]);
    await this.memberRepo.delete(memberId);
  }

  async assertMember(projectId: string, userId: string): Promise<ProjectMember> {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
    });
    if (!member) throw new ForbiddenException('프로젝트 멤버가 아닙니다.');
    return member;
  }

  private async assertRole(
    projectId: string,
    userId: string,
    roles: ProjectRole[],
  ): Promise<void> {
    const member = await this.assertMember(projectId, userId);
    if (!roles.includes(member.role)) {
      throw new ForbiddenException('권한이 없습니다.');
    }
  }
}
