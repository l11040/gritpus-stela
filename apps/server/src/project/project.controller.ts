import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto, UpdateMemberRoleDto } from './project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  @ApiResponse({ status: 201, description: '생성 완료' })
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProjectDto) {
    return this.projectService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 프로젝트 목록' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.projectService.findAllByUser(user.id);
  }

  @Get(':projectId')
  @ApiOperation({ summary: '프로젝트 상세' })
  findOne(@Param('projectId') projectId: string) {
    return this.projectService.findOne(projectId);
  }

  @Patch(':projectId')
  @ApiOperation({ summary: '프로젝트 수정' })
  update(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(projectId, user.id, dto);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: '프로젝트 삭제' })
  remove(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectService.remove(projectId, user.id);
  }

  @Post(':projectId/members')
  @ApiOperation({ summary: '멤버 추가' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  addMember(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectService.addMember(projectId, user.id, dto);
  }

  @Get(':projectId/members')
  @ApiOperation({ summary: '멤버 목록' })
  getMembers(@Param('projectId') projectId: string) {
    return this.projectService.getMembers(projectId);
  }

  @Patch(':projectId/members/:memberId')
  @ApiOperation({ summary: '멤버 역할 변경' })
  updateMemberRole(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.projectService.updateMemberRole(projectId, user.id, memberId, dto);
  }

  @Delete(':projectId/members/:memberId')
  @ApiOperation({ summary: '멤버 제거' })
  removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectService.removeMember(projectId, user.id, memberId);
  }
}
