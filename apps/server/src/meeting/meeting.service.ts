import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingMinutes, MeetingMinutesStatus } from './entities/meeting-minutes.entity';
import { MeetingAiService } from './meeting-ai.service';
import { DocumentService } from '../document/document.service';
import { BoardService } from '../board/board.service';
import { CreateMeetingDto, UpdatePreviewDto, ConfirmMeetingDto, ParsedActionItemDto } from './meeting.dto';
import { BoardColumn } from '../board/entities/column.entity';

@Injectable()
export class MeetingService {
  constructor(
    @InjectRepository(MeetingMinutes)
    private readonly meetingRepo: Repository<MeetingMinutes>,
    @InjectRepository(BoardColumn)
    private readonly columnRepo: Repository<BoardColumn>,
    private readonly aiService: MeetingAiService,
    private readonly documentService: DocumentService,
    private readonly boardService: BoardService,
  ) {}

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

  async parse(meetingId: string): Promise<MeetingMinutes> {
    const meeting = await this.findOne(meetingId);
    if (!meeting.rawContent) {
      throw new BadRequestException('파싱할 회의록 내용이 없습니다.');
    }

    await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.PARSING });

    try {
      const result = await this.aiService.parseMinutes(
        meeting.projectId,
        meeting.rawContent,
      );

      await this.meetingRepo.update(meetingId, {
        parsedActionItems: result.actionItems as any,
        meetingSummary: result.meetingSummary,
        status: MeetingMinutesStatus.PARSED,
      });
    } catch {
      await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.FAILED });
      throw new BadRequestException('AI 파싱에 실패했습니다. 다시 시도해주세요.');
    }

    return this.findOne(meetingId);
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
    await this.meetingRepo.update(meetingId, {
      parsedActionItems: dto.actionItems as any,
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
      assigneeId: item.assigneeId,
      dueDate: item.dueDate,
    }));

    await this.boardService.batchCreateCards({ cards });

    await this.meetingRepo.update(meetingId, { status: MeetingMinutesStatus.CONFIRMED });

    return { cardsCreated: cards.length };
  }

  async remove(meetingId: string): Promise<void> {
    await this.meetingRepo.delete(meetingId);
  }
}
