import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  CreateWeeklyWorkProjectDto,
  GenerateWeeklyWorkDto,
  WeeklyWorkHistoryQueryDto,
  WeeklyWorkUsersQueryDto,
  UpdateWeeklyHistoryDto,
} from './weekly-work.dto';
import { WeeklyWorkService } from './weekly-work.service';
import {
  CreateWeeklyWorkProjectDocs,
  DeleteWeeklyWorkHistoryDocs,
  DeleteWeeklyWorkProjectDocs,
  GenerateWeeklyWorkDocs,
  GetWeeklyWorkHistoryDocs,
  GetWeeklyWorkHistoryOneDocs,
  GetWeeklyWorkProjectsDocs,
  GetWeeklyWorkUsersDocs,
  UpdateWeeklyWorkHistoryDocs,
} from './weekly-work.swagger';

@ApiTags('weekly-work')
@Controller('weekly-work')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeeklyWorkController {
  constructor(private readonly weeklyWorkService: WeeklyWorkService) {}

  @Post('generate')
  @GenerateWeeklyWorkDocs()
  generate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateWeeklyWorkDto,
  ) {
    return this.weeklyWorkService.generate(user.id, dto);
  }

  @Get('history')
  @GetWeeklyWorkHistoryDocs()
  getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: WeeklyWorkHistoryQueryDto,
  ) {
    return this.weeklyWorkService.getHistory(user.id, query);
  }

  @Get('projects')
  @GetWeeklyWorkProjectsDocs()
  getProjects() {
    return this.weeklyWorkService.getProjects();
  }

  @Post('projects')
  @CreateWeeklyWorkProjectDocs()
  createProject(@Body() dto: CreateWeeklyWorkProjectDto) {
    return this.weeklyWorkService.createProject(dto);
  }

  @Delete('projects/:projectId')
  @DeleteWeeklyWorkProjectDocs()
  deleteProject(@Param('projectId') projectId: string) {
    return this.weeklyWorkService.deleteProject(projectId);
  }

  @Get('users')
  @GetWeeklyWorkUsersDocs()
  getUsers(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: WeeklyWorkUsersQueryDto,
  ) {
    return this.weeklyWorkService.getUsers(user.id, query);
  }

  @Get('history/:historyId')
  @GetWeeklyWorkHistoryOneDocs()
  getHistoryOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('historyId') historyId: string,
  ) {
    return this.weeklyWorkService.getHistoryOne(user.id, historyId);
  }

  @Put('history/:historyId')
  @UpdateWeeklyWorkHistoryDocs()
  updateHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('historyId') historyId: string,
    @Body() dto: UpdateWeeklyHistoryDto,
  ) {
    return this.weeklyWorkService.updateHistory(user.id, historyId, dto);
  }

  @Delete('history/:historyId')
  @DeleteWeeklyWorkHistoryDocs()
  deleteHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('historyId') historyId: string,
  ) {
    return this.weeklyWorkService.deleteHistory(user.id, historyId);
  }
}
