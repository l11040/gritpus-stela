import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Sse,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { MeetingService } from './meeting.service';
import { MeetingProgressService } from './meeting-progress.service';
import { CreateMeetingDto, UpdatePreviewDto, ConfirmMeetingDto } from './meeting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
} from '../common/constants/upload.constants';

@ApiTags('meetings')
@Controller('projects/:projectId/meetings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly progressService: MeetingProgressService,
  ) {}

  @Post()
  @ApiOperation({ summary: '회의록 생성 (텍스트 또는 파일)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMeetingDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_UPLOAD_FILE_SIZE_BYTES,
            message: MAX_UPLOAD_FILE_SIZE_ERROR_MESSAGE,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
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
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'AI로 회의록 파싱 (비동기)' })
  parse(@Param('meetingId') meetingId: string) {
    return this.meetingService.parseAsync(meetingId);
  }

  @Post(':meetingId/parse/cancel')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: '진행 중인 AI 파싱 중단' })
  cancelParse(@Param('meetingId') meetingId: string) {
    return this.meetingService.cancelParse(meetingId);
  }

  @Sse(':meetingId/parse/events')
  @ApiOperation({ summary: '파싱 진행 상황 SSE 스트림' })
  parseEvents(@Param('meetingId') meetingId: string): Observable<MessageEvent> {
    return this.progressService.subscribe(meetingId);
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
