import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { MeetingService } from './meeting.service';
import { CreateMeetingDto, UpdatePreviewDto, ConfirmMeetingDto } from './meeting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('meetings')
@Controller('projects/:projectId/meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({ summary: '회의록 생성 (텍스트 또는 파일)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeetingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.meetingService.create(projectId, user.id, dto, file);
  }

  @Get()
  @ApiOperation({ summary: '회의록 목록' })
  findAll(@Param('projectId') projectId: string) {
    return this.meetingService.findAll(projectId);
  }

  @Get(':meetingId')
  @ApiOperation({ summary: '회의록 상세' })
  findOne(@Param('meetingId') meetingId: string) {
    return this.meetingService.findOne(meetingId);
  }

  @Post(':meetingId/parse')
  @ApiOperation({ summary: 'AI로 회의록 파싱' })
  parse(@Param('meetingId') meetingId: string) {
    return this.meetingService.parse(meetingId);
  }

  @Get(':meetingId/preview')
  @ApiOperation({ summary: '파싱된 액션 아이템 미리보기' })
  getPreview(@Param('meetingId') meetingId: string) {
    return this.meetingService.getPreview(meetingId);
  }

  @Patch(':meetingId/preview')
  @ApiOperation({ summary: '파싱 결과 수정' })
  updatePreview(@Param('meetingId') meetingId: string, @Body() dto: UpdatePreviewDto) {
    return this.meetingService.updatePreview(meetingId, dto);
  }

  @Post(':meetingId/confirm')
  @ApiOperation({ summary: '액션 아이템 확인 후 칸반 카드 생성' })
  confirm(@Param('meetingId') meetingId: string, @Body() dto: ConfirmMeetingDto) {
    return this.meetingService.confirm(meetingId, dto);
  }

  @Delete(':meetingId')
  @ApiOperation({ summary: '회의록 삭제' })
  remove(@Param('meetingId') meetingId: string) {
    return this.meetingService.remove(meetingId);
  }
}
