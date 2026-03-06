import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingMinutes, MeetingMinutesStatus } from './entities/meeting-minutes.entity';
import { MeetingAiService } from './meeting-ai.service';
import { DocumentService } from '../document/document.service';
import { BoardService } from '../board/board.service';
import { CreateMeetingDto, UpdatePreviewDto, ConfirmMeetingDto, ParsedActionItemDto } from './meeting.dto';
import { BoardColumn } from '../board/entities/column.entity';
import { ProjectService } from '../project/project.service';
import { normalizeActionItemsDueDates } from './ai/due-date-normalizer';
import { MeetingProgressService } from './meeting-progress.service';
import type { ProjectMemberProfile } from './ai/assignee-resolver.service';
import { ParseCancelledError, isParseCancelledError, throwIfAborted } from './ai/parse-cancel';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MeetingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MeetingService.name);
  private readonly parseAbortControllers = new Map<string, AbortController>();

  constructor(
    @InjectRepository(MeetingMinutes)
    private readonly meetingRepo: Repository<MeetingMinutes>,
    @InjectRepository(BoardColumn)
    private readonly columnRepo: Repository<BoardColumn>,
    private readonly aiService: MeetingAiService,
    private readonly documentService: DocumentService,
    private readonly boardService: BoardService,
    private readonly projectService: ProjectService,
    private readonly progressService: MeetingProgressService,
    private readonly notificationService: NotificationService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const staleCount = await this.meetingRepo.count({
      where: { status: MeetingMinutesStatus.PARSING },
    });
    if (staleCount === 0) return;

    await this.meetingRepo.update(
      { status: MeetingMinutesStatus.PARSING },
      { status: MeetingMinutesStatus.FAILED },
    );
    this.logger.warn(
      `Recovered ${staleCount} stale parsing meeting(s) after server restart.`,
    );
  }

  async create(
    projectId: string,
    userId: string,
    dto: CreateMeetingDto,
    file?: Express.Multer.File,
  ): Promise<MeetingMinutes> {
    let documentId: string | undefined;
    let rawContent = dto.rawContent;

    if (file) {
      const doc = await this.documentService.upload(projectId, userId, file);
      documentId = doc.id;

      if (!rawContent) {
        rawContent = await this.documentService.readFileContent(doc.id);
      }
    }

    if (!rawContent) {
      throw new BadRequestException('회의록 내용 또는 파일을 제공해야 합니다.');
    }

    const meeting = this.meetingRepo.create({
      title: dto.title,
      rawContent,
      projectId,
      documentId,
      createdById: userId,
    });

    return this.meetingRepo.save(meeting);
  }

  async findAll(projectId: string): Promise<MeetingMinutes[]> {
    return this.meetingRepo.find({
      where: { projectId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(meetingId: string): Promise<MeetingMinutes> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['createdBy', 'document'],
    });
    if (!meeting) throw new NotFoundException('회의록을 찾을 수 없습니다.');
    return meeting;
  }

  async parseAsync(meetingId: string): Promise<void> {
    const meeting = await this.findOne(meetingId);
    if (!meeting.rawContent) {
      throw new BadRequestException('파싱할 회의록 내용이 없습니다.');
    }
    if (this.parseAbortControllers.has(meetingId)) {
      throw new BadRequestException('이미 파싱 중인 회의록입니다.');
    }

    await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.PARSING });
    this.progressService.start(meetingId);
    this.progressService.emit(meetingId, { step: 'started', message: 'AI 파싱을 시작합니다...' });

    const abortController = new AbortController();
    this.parseAbortControllers.set(meetingId, abortController);

    // fire-and-forget
    this.runParse(meetingId, meeting, abortController.signal).catch(() => {});
  }

  async cancelParse(meetingId: string): Promise<{ cancelled: boolean; message: string }> {
    const meeting = await this.findOne(meetingId);
    const controller = this.parseAbortControllers.get(meetingId);
    if (!controller) {
      if (meeting.status === MeetingMinutesStatus.PARSING) {
        await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.FAILED });
        this.progressService.start(meetingId);
        this.progressService.emit(meetingId, {
          step: 'failed',
          message: '서버 재시작으로 파싱 컨텍스트가 유실되어 중단 처리되었습니다.',
        });
        this.progressService.complete(meetingId);
        return {
          cancelled: true,
          message: '파싱 컨텍스트 유실 상태를 중단 처리했습니다.',
        };
      }
      return { cancelled: false, message: '중단할 파싱 작업이 없습니다.' };
    }

    if (!controller.signal.aborted) {
      controller.abort(new ParseCancelledError('사용자 요청으로 파싱이 중단되었습니다.'));
    }

    return { cancelled: true, message: '파싱 중단 요청을 처리했습니다.' };
  }

  private async runParse(
    meetingId: string,
    meeting: MeetingMinutes,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      throwIfAborted(signal);
      const projectMembers = await this.projectService.getMembers(meeting.projectId);
      throwIfAborted(signal);
      const memberProfiles = this.toMemberProfiles(projectMembers);

      this.progressService.emit(meetingId, { step: 'analyzing', message: '회의록을 분석하고 있습니다...' });
      const onAgentProgress = (event: { step: 'agent_iteration' | 'agent_tool'; message: string; detail?: string; iteration?: number; maxIterations?: number }) => {
        this.progressService.emit(meetingId, event);
      };
      const result = await this.aiService.parseMinutes(
        meeting.projectId,
        meeting.rawContent,
        meeting.createdAt,
        onAgentProgress,
        signal,
      );
      throwIfAborted(signal);

      this.progressService.emit(meetingId, { step: 'resolving_assignees', message: '담당자를 매칭하고 있습니다...' });
      const matchedActionItems = await this.aiService.resolveActionItemsAssignees(
        result.actionItems,
        memberProfiles,
        undefined,
        signal,
      );
      throwIfAborted(signal);
      const normalizedActionItems = normalizeActionItemsDueDates(
        matchedActionItems,
        meeting.createdAt,
      );

      this.progressService.emit(meetingId, { step: 'summarizing', message: '회의 요약을 생성하고 있습니다...' });
      const richSummary = await this.aiService.summarizeMeetingMinutes(
        meeting.title,
        meeting.rawContent,
        normalizedActionItems,
        meeting.createdAt,
        signal,
      );
      throwIfAborted(signal);

      await this.meetingRepo.update(meetingId, {
        parsedActionItems: normalizedActionItems as any,
        meetingSummary: richSummary || result.meetingSummary,
        status: MeetingMinutesStatus.PARSED,
      });

      this.progressService.emit(meetingId, { step: 'completed', message: '파싱이 완료되었습니다!' });

      // 회의록 작성자에게 알림 전송
      await this.notificationService.notifyMeetingParsed(
        meetingId,
        meeting.title,
        meeting.createdById,
      );
    } catch (err) {
      if (isParseCancelledError(err)) {
        this.logger.log(`Parse cancelled for meeting ${meetingId}`);
        await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.FAILED });
        this.progressService.emit(meetingId, {
          step: 'failed',
          message: err.message || '사용자 요청으로 파싱이 중단되었습니다.',
        });
      } else {
        this.logger.error(`Parse failed for meeting ${meetingId}`, err);
        await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.FAILED });
        this.progressService.emit(meetingId, { step: 'failed', message: 'AI 파싱에 실패했습니다.' });
      }
    } finally {
      this.parseAbortControllers.delete(meetingId);
      this.progressService.complete(meetingId);
    }
  }

  async getPreview(meetingId: string): Promise<{ meetingSummary: string; actionItems: ParsedActionItemDto[] }> {
    const meeting = await this.findOne(meetingId);
    if (meeting.status !== MeetingMinutesStatus.PARSED && meeting.status !== MeetingMinutesStatus.CONFIRMED) {
      throw new BadRequestException('아직 파싱되지 않은 회의록입니다.');
    }
    return {
      meetingSummary: meeting.meetingSummary || '',
      actionItems: (meeting.parsedActionItems as any) || [],
    };
  }

  async updatePreview(meetingId: string, dto: UpdatePreviewDto): Promise<MeetingMinutes> {
    const meeting = await this.findOne(meetingId);
    const projectMembers = await this.projectService.getMembers(meeting.projectId);
    const matchedActionItems = await this.aiService.resolveActionItemsAssignees(
      dto.actionItems,
      this.toMemberProfiles(projectMembers),
      { preferExistingIds: true },
    );
    const normalizedActionItems = normalizeActionItemsDueDates(
      matchedActionItems,
      meeting.createdAt,
    );

    await this.meetingRepo.update(meetingId, {
      parsedActionItems: normalizedActionItems as any,
    });
    return this.findOne(meetingId);
  }

  async confirm(meetingId: string, dto: ConfirmMeetingDto): Promise<{ cardsCreated: number }> {
    const meeting = await this.findOne(meetingId);
    if (!meeting.parsedActionItems || !Array.isArray(meeting.parsedActionItems)) {
      throw new BadRequestException('확인할 액션 아이템이 없습니다.');
    }

    const board = await this.boardService.getBoard(dto.boardId);
    let targetColumn = board.columns[0];

    if (dto.columnId) {
      const col = await this.columnRepo.findOne({ where: { id: dto.columnId } });
      if (col) targetColumn = col;
    }

    const items = meeting.parsedActionItems as ParsedActionItemDto[];
    const cards = items.map((item) => ({
      title: item.title,
      description: item.description,
      priority: item.priority,
      columnId: targetColumn.id,
      assigneeIds: item.assigneeIds?.length
        ? item.assigneeIds
        : item.assigneeId
          ? [item.assigneeId]
          : undefined,
      dueDate: item.dueDate,
    }));

    await this.boardService.batchCreateCards({ cards });

    await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.CONFIRMED });

    return { cardsCreated: cards.length };
  }

  async remove(meetingId: string): Promise<void> {
    await this.meetingRepo.delete(meetingId);
  }

  private toMemberProfiles(
    members: Awaited<ReturnType<ProjectService['getMembers']>>,
  ): ProjectMemberProfile[] {
    return members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
    }));
  }
}
