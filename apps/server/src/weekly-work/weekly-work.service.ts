import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ChatService } from '../chat/chat.service';
import { WeeklyWorkHistory, WeeklyWorkEntryType } from './entities/weekly-work-history.entity';
import { WeeklyWorkProject } from './entities/weekly-work-project.entity';
import {
  CreateWeeklyWorkProjectDto,
  GenerateWeeklyWorkDto,
  UpdateWeeklyHistoryDto,
  WeeklyWorkHistoryQueryDto,
  WeeklyWorkUserSummaryDto,
  WeeklyWorkUsersQueryDto,
} from './weekly-work.dto';

type WeeklySection = {
  category: string;
  items: string[];
  meetings: string[];
};

type WeeklyStructuredResult = {
  sections: WeeklySection[];
};

@Injectable()
export class WeeklyWorkService {
  constructor(
    @InjectRepository(WeeklyWorkHistory)
    private readonly historyRepo: Repository<WeeklyWorkHistory>,
    @InjectRepository(WeeklyWorkProject)
    private readonly projectRepo: Repository<WeeklyWorkProject>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly chatService: ChatService,
  ) {}

  async generate(userId: string, dto: GenerateWeeklyWorkDto): Promise<WeeklyWorkHistory> {
    const sourceText = dto.sourceText?.trim();
    if (!sourceText) {
      throw new BadRequestException('입력 내용이 비어 있습니다.');
    }

    const previewOnly = dto.previewOnly === true;
    const weekStartDate = this.normalizeWeekStartDate(dto.weekStartDate);
    const projectId = dto.projectId;
    const existing = await this.historyRepo.findOne({
      where: { userId, type: dto.type, weekStartDate, projectId },
    });

    const shouldOverwrite = dto.overwriteExisting !== false;
    if (!previewOnly && existing && !shouldOverwrite) {
      throw new ConflictException(this.getDuplicateHistoryMessage(dto.type, weekStartDate));
    }

    let referencedPlan: WeeklyWorkHistory | null = null;
    if (dto.type === WeeklyWorkEntryType.REPORT) {
      referencedPlan = await this.resolveReferencePlan(userId, weekStartDate, dto.planReferenceId);
    }
    const weekDateReference = this.buildWeekDateReference(weekStartDate);

    const prompt = dto.type === WeeklyWorkEntryType.PLAN
      ? this.buildPlanGeneratePrompt({
          weekStartDate,
          sourceText,
          weekDateReference,
        })
      : this.buildReportGeneratePrompt({
          weekStartDate,
          sourceText,
          weekDateReference,
          referencePlanMarkdown: referencedPlan?.markdown || null,
        });

    const llm = await this.chatService.chat(prompt);
    const structured = this.parseStructuredResult(llm.response, sourceText);
    const markdown = this.renderFixedMarkdown(dto.type, structured.sections);
    const markdownOverride = dto.markdownOverride?.trim();
    if (!previewOnly && dto.markdownOverride !== undefined && !markdownOverride) {
      throw new BadRequestException('저장할 Markdown 내용이 비어 있습니다.');
    }

    if (previewOnly) {
      const preview = new WeeklyWorkHistory();
      preview.id = '';
      preview.userId = userId;
      preview.projectId = projectId;
      preview.type = dto.type;
      preview.weekStartDate = weekStartDate;
      preview.inputType = dto.inputType;
      preview.sourceText = sourceText;
      preview.markdown = markdown;
      preview.planReferenceId = referencedPlan?.id || null;
      preview.metadata = {
        weekStartDate,
        formatVersion: 'fixed-v1',
        sectionCount: structured.sections.length,
        previewOnly: true,
      };
      const now = new Date();
      preview.createdAt = now;
      preview.updatedAt = now;
      return preview;
    }

    const history = existing || this.historyRepo.create({
      userId,
      projectId,
      type: dto.type,
      weekStartDate,
    });
    history.inputType = dto.inputType;
    history.sourceText = sourceText;
    history.markdown = markdownOverride || markdown;
    history.planReferenceId = referencedPlan?.id || null;
    history.metadata = {
      weekStartDate,
      formatVersion: 'fixed-v1',
      sectionCount: structured.sections.length,
    };

    try {
      return await this.historyRepo.save(history);
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException(this.getDuplicateHistoryMessage(dto.type, weekStartDate));
      }
      throw error;
    }
  }

  async getHistory(userId: string, query: WeeklyWorkHistoryQueryDto): Promise<WeeklyWorkHistory[]> {
    const normalizedWeekStartDate = query.weekStartDate
      ? this.normalizeWeekStartDate(query.weekStartDate)
      : undefined;
    const where: FindOptionsWhere<WeeklyWorkHistory> = {};

    if (!query.includeAllUsers) {
      where.userId = query.userId || userId;
    } else if (query.userId) {
      where.userId = query.userId;
    }

    if (query.type) where.type = query.type;
    if (normalizedWeekStartDate) where.weekStartDate = normalizedWeekStartDate;
    if (query.projectId) where.projectId = query.projectId;

    return this.historyRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getUsers(
    currentUserId: string,
    query: WeeklyWorkUsersQueryDto,
  ): Promise<WeeklyWorkUserSummaryDto[]> {
    const userRows = await this.userRepo
      .createQueryBuilder('user')
      .select('user.id', 'userId')
      .addSelect('user.name', 'name')
      .addSelect('user.email', 'email')
      .where('user.isApproved = :approved', { approved: true })
      .orWhere('user.id = :currentUserId', { currentUserId })
      .orderBy('user.name', 'ASC')
      .addOrderBy('user.email', 'ASC')
      .getRawMany<{ userId: string; name: string; email: string }>();

    if (userRows.length === 0) {
      return [];
    }

    const weekStartDate = query.weekStartDate
      ? this.normalizeWeekStartDate(query.weekStartDate)
      : null;

    const statusMap = new Map<string, { hasPlan: boolean; hasReport: boolean }>();
    if (weekStartDate) {
      const userIds = userRows.map((row) => row.userId);
      const historyRows = await this.historyRepo
        .createQueryBuilder('history')
        .select('history.userId', 'userId')
        .addSelect('history.type', 'type')
        .where('history.userId IN (:...userIds)', { userIds })
        .andWhere('history.weekStartDate = :weekStartDate', { weekStartDate })
        .getRawMany<{ userId: string; type: WeeklyWorkEntryType }>();

      for (const historyRow of historyRows) {
        const status = statusMap.get(historyRow.userId) || {
          hasPlan: false,
          hasReport: false,
        };
        if (historyRow.type === WeeklyWorkEntryType.PLAN) {
          status.hasPlan = true;
        }
        if (historyRow.type === WeeklyWorkEntryType.REPORT) {
          status.hasReport = true;
        }
        statusMap.set(historyRow.userId, status);
      }
    }

    return userRows.map((row) => {
      const status = statusMap.get(row.userId);
      return {
        userId: row.userId,
        name: row.name,
        email: row.email,
        hasPlan: status?.hasPlan || false,
        hasReport: status?.hasReport || false,
        isMe: row.userId === currentUserId,
      };
    });
  }

  async getProjects(): Promise<WeeklyWorkProject[]> {
    return this.projectRepo.find({ order: { name: 'ASC' } });
  }

  async createProject(dto: CreateWeeklyWorkProjectDto): Promise<WeeklyWorkProject> {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('프로젝트 이름이 비어 있습니다.');
    }

    const existing = await this.projectRepo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('같은 이름의 프로젝트가 이미 존재합니다.');
    }

    const project = this.projectRepo.create({ name });
    return this.projectRepo.save(project);
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    await this.projectRepo.remove(project);
  }

  async getHistoryOne(userId: string, historyId: string): Promise<WeeklyWorkHistory> {
    const history = await this.historyRepo.findOne({
      where: { id: historyId, userId },
    });

    if (!history) {
      throw new NotFoundException('히스토리를 찾을 수 없습니다.');
    }

    return history;
  }

  async updateHistory(
    userId: string,
    historyId: string,
    dto: UpdateWeeklyHistoryDto,
  ): Promise<WeeklyWorkHistory> {
    const history = await this.getHistoryOne(userId, historyId);
    const markdown = dto.markdown?.trim();
    if (!markdown) {
      throw new BadRequestException('수정할 Markdown 내용이 비어 있습니다.');
    }

    history.markdown = markdown;
    return this.historyRepo.save(history);
  }

  async deleteHistory(userId: string, historyId: string): Promise<void> {
    const history = await this.getHistoryOne(userId, historyId);
    await this.historyRepo.remove(history);
  }

  private async resolveReferencePlan(
    userId: string,
    weekStartDate: string,
    planReferenceId?: string,
  ): Promise<WeeklyWorkHistory | null> {
    if (planReferenceId) {
      const plan = await this.historyRepo.findOne({
        where: {
          id: planReferenceId,
          userId,
          type: WeeklyWorkEntryType.PLAN,
        },
      });
      if (!plan) {
        throw new NotFoundException('참조할 주간 계획 히스토리를 찾을 수 없습니다.');
      }
      return plan;
    }

    return this.historyRepo.findOne({
      where: {
        userId,
        type: WeeklyWorkEntryType.PLAN,
        weekStartDate,
      },
      order: { createdAt: 'DESC' },
    });
  }

  private normalizeWeekStartDate(input?: string): string {
    const baseYmd = this.normalizeYmdInput(input) || this.getTodayYmdInSeoul();
    const target = this.parseYmdAsUtc(baseYmd);

    const day = target.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    target.setUTCDate(target.getUTCDate() + diff);

    const year = target.getUTCFullYear();
    const month = String(target.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(target.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  }

  private buildWeekDateReference(weekStartDate: string): string {
    const labels: Array<{ day: string; offset: number }> = [
      { day: '월', offset: 0 },
      { day: '화', offset: 1 },
      { day: '수', offset: 2 },
      { day: '목', offset: 3 },
      { day: '금', offset: 4 },
      { day: '토', offset: 5 },
      { day: '일', offset: 6 },
    ];

    const base = this.parseYmdAsUtc(weekStartDate);
    return labels
      .map(({ day, offset }) => {
        const target = new Date(base);
        target.setUTCDate(target.getUTCDate() + offset);
        const year = target.getUTCFullYear();
        const month = String(target.getUTCMonth() + 1).padStart(2, '0');
        const date = String(target.getUTCDate()).padStart(2, '0');
        return `- ${day}: ${year}-${month}-${date} / ${month}/${date}(${day})`;
      })
      .join('\n');
  }

  private buildPlanGeneratePrompt(params: {
    weekStartDate: string;
    sourceText: string;
    weekDateReference: string;
  }): string {
    return `당신은 한국어 업무 정리 도우미입니다.

목표:
- 입력 원문을 읽고 "주간 업무 계획" 문서를 구조화합니다.
- 반드시 아래 JSON 스키마로만 응답합니다.
- JSON 외 설명/머리말/코드블럭을 절대 출력하지 마세요.

문서 타입: 주간 업무 계획
기준 주 시작일(월요일): ${params.weekStartDate}

신뢰 가능한 주간 날짜 매핑(한국 시간, 반드시 이 매핑을 우선 사용):
${params.weekDateReference}

응답 JSON 스키마:
{
  "sections": [
    {
      "category": "카테고리명",
      "items": ["업무 항목", "업무 항목"],
      "meetings": ["[일시] : 회의명", "[일시] : 회의명"]
    }
  ]
}

필수 규칙:
1) sections는 1개 이상이어야 합니다.
2) category는 비어 있으면 안 됩니다.
3) meetings는 반드시 "[일시] : 내용" 형태를 사용합니다. 일시는 "MM/DD(요일) HH:mm" 또는 "MM/DD(요일) HH:mm~HH:mm" 형식을 사용합니다.
4) 과장/허위 금지. 모호하면 "확인 필요"를 붙입니다.
5) 입력에 반복 미팅 정보가 있으면 meetings에 적극 반영합니다.
6) "매주 화 15:00" 같은 반복 표현은 그대로 쓰지 말고, 위 날짜 매핑을 사용해 기준 주 실제 날짜(예: "03/10(화) 15:00")로 변환합니다.
7) 인터뷰/면접/미팅/회의 등 일정성 항목은 items가 아니라 meetings로 넣고, 같은 일시 포맷을 사용합니다.
8) category는 프로젝트/과제 중심으로 작성하고, 프로젝트가 아니거나 분류가 애매하면 category를 반드시 "기타"로 사용합니다.
9) "정기 미팅", "미팅", "회의", "채용", "협업 도구", "운영" 같은 일반성/공통성 분류를 category로 만들지 말고 "기타"로 통합합니다.
10) 소속(프로젝트/과제)이 분명하지 않은 meetings는 모두 "기타" 섹션의 meetings에 넣습니다.
11) 입력 원문에 없는 신규 사실/시간/고유명사를 만들어 넣지 않습니다.
12) 시간/날짜를 추정하지 않습니다. 원문에 없거나 불명확하면 "[일시 확인 필요] : 내용"으로 작성합니다.
13) 주어진 형식과 무관한 설명 문장은 넣지 않습니다.

출력 의도 예시:
- AX 프로젝트에 속한 회의: category="AX 프로젝트", meetings=["[03/10(화) 15:00] : AX 미팅"]
- 소속 없는 정기 회의: category="기타", meetings=["[03/12(목) 13:30] : 개발사업부 Tech 그룹 주간회의"]

입력 원문:
---
${params.sourceText}
---
`;
  }

  private buildReportGeneratePrompt(params: {
    weekStartDate: string;
    sourceText: string;
    weekDateReference: string;
    referencePlanMarkdown: string | null;
  }): string {
    return `당신은 한국어 업무 정리 도우미입니다.

목표:
- 입력 원문과 참조용 주간 계획을 읽고 "주간 업무 보고" 문서를 구조화합니다.
- 반드시 아래 JSON 스키마로만 응답합니다.
- JSON 외 설명/머리말/코드블럭을 절대 출력하지 마세요.

문서 타입: 주간 업무 보고
기준 주 시작일(월요일): ${params.weekStartDate}

신뢰 가능한 주간 날짜 매핑(한국 시간, 반드시 이 매핑을 우선 사용):
${params.weekDateReference}

응답 JSON 스키마:
{
  "sections": [
    {
      "category": "카테고리명",
      "items": ["업무 항목", "업무 항목"],
      "meetings": ["[일시] : 회의명", "[일시] : 회의명"]
    }
  ]
}

필수 규칙:
1) sections는 1개 이상이어야 합니다.
2) category는 비어 있으면 안 됩니다.
3) meetings는 반드시 "[일시] : 내용" 형태를 사용합니다. 일시는 "MM/DD(요일) HH:mm" 또는 "MM/DD(요일) HH:mm~HH:mm" 형식을 사용합니다.
4) 보고 문서는 실제 수행/완료/이슈 중심으로 정리합니다.
5) 인터뷰/면접/미팅/회의 등 일정성 항목은 items가 아니라 meetings로 넣고, 같은 일시 포맷을 사용합니다.
6) category는 프로젝트/과제 중심으로 작성하고, 프로젝트가 아니거나 분류가 애매하면 category를 반드시 "기타"로 사용합니다.
7) "정기 미팅", "미팅", "회의", "채용", "협업 도구", "운영" 같은 일반성/공통성 분류를 category로 만들지 말고 "기타"로 통합합니다.
8) 소속(프로젝트/과제)이 분명하지 않은 meetings는 모두 "기타" 섹션의 meetings에 넣습니다.
9) 입력 원문에 없는 신규 사실/시간/고유명사를 만들어 넣지 않습니다.
10) 시간/날짜를 추정하지 않습니다. 다만 요일/월일 계산은 위 날짜 매핑을 사용해 정확히 맞춥니다.
11) 보고 작성 시 계획에 있었지만 보고 원문에서 언급이 빠진 항목은 "미진행"으로 표시하지 말고, 진행된 것으로 보고 그대로 유지합니다.
12) 입력 원문에 반복 미팅 정보가 있더라도, 주간 보고 결과에는 반복 미팅을 반영하지 않습니다.
13) 주어진 형식과 무관한 설명 문장은 넣지 않습니다.

출력 의도 예시:
- AX 프로젝트에 속한 회의: category="AX 프로젝트", meetings=["[03/10(화) 15:00] : AX 미팅"]
- 소속 없는 정기 회의: category="기타", meetings=["[03/12(목) 13:30] : 개발사업부 Tech 그룹 주간회의"]

${params.referencePlanMarkdown
  ? `참조용 주간 계획:
---
${params.referencePlanMarkdown}
---`
  : '참조용 주간 계획: 없음'}

입력 원문:
---
${params.sourceText}
---
`;
  }

  private parseStructuredResult(raw: string, sourceText: string): WeeklyStructuredResult {
    const parsed = this.parseJsonFromLlm(raw);
    if (!parsed || typeof parsed !== 'object' || !('sections' in parsed)) {
      return this.buildFallbackStructuredResult(sourceText);
    }

    const sections = this.normalizeSections((parsed as { sections?: unknown }).sections);
    if (sections.length === 0) {
      return this.buildFallbackStructuredResult(sourceText);
    }

    return { sections };
  }

  private parseJsonFromLlm(raw: string): unknown {
    const trimmed = raw.trim();
    const candidates: string[] = [trimmed];

    const withoutFence = this.stripCodeFence(trimmed);
    if (withoutFence !== trimmed) {
      candidates.push(withoutFence);
    }

    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      candidates.push(withoutFence.slice(firstBrace, lastBrace + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // 계속 시도
      }
    }

    return null;
  }

  private normalizeSections(value: unknown): WeeklySection[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const rawSections = value
      .map((section) => this.normalizeSection(section))
      .filter((section): section is WeeklySection => section !== null);

    if (rawSections.length === 0) {
      return [];
    }

    const merged = new Map<string, { items: string[]; meetings: string[] }>();
    const order: string[] = [];

    for (const section of rawSections) {
      const category = section.category || '기타';
      const current = merged.get(category) || { items: [], meetings: [] };

      if (!merged.has(category)) {
        merged.set(category, current);
        order.push(category);
      }

      for (const item of section.items) {
        if (!current.items.includes(item)) {
          current.items.push(item);
        }
      }
      for (const meeting of section.meetings) {
        if (!current.meetings.includes(meeting)) {
          current.meetings.push(meeting);
        }
      }
    }

    return order.map((category) => ({
      category,
      items: merged.get(category)?.items || [],
      meetings: merged.get(category)?.meetings || [],
    }));
  }

  private normalizeSection(value: unknown): WeeklySection | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const data = value as Record<string, unknown>;
    const category = this.sanitizeLine(
      this.pickFirstString(data.category, data.name, data.project, data.group),
    );
    if (!category) {
      return null;
    }

    const rawItems = this.normalizeStringList(data.items ?? data.tasks ?? data.works ?? data.workItems);
    const rawMeetings = this.normalizeStringList(data.meetings ?? data.events ?? data.meetingItems);
    const items = rawItems;
    const meetings = rawMeetings;

    if (items.length === 0 && meetings.length === 0) {
      return null;
    }

    return {
      category,
      items,
      meetings,
    };
  }

  private normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const unique = new Set<string>();
    for (const item of value) {
      if (typeof item !== 'string') continue;
      const line = this.sanitizeLine(item);
      if (!line) continue;
      unique.add(line);
    }

    return Array.from(unique);
  }

  private buildFallbackStructuredResult(sourceText: string): WeeklyStructuredResult {
    const lines = sourceText
      .split('\n')
      .map((line) => this.sanitizeLine(line))
      .filter(Boolean)
      .slice(0, 12);

    if (lines.length === 0) {
      throw new BadRequestException('주간 문서 생성 결과가 비어 있습니다. 입력 내용을 확인해 주세요.');
    }

    return {
      sections: [
        {
          category: '기타',
          items: lines,
          meetings: [],
        },
      ],
    };
  }

  private renderFixedMarkdown(
    type: WeeklyWorkEntryType,
    sections: WeeklySection[],
  ): string {
    const title = type === WeeklyWorkEntryType.PLAN ? '주간 업무 계획' : '주간 업무 보고';
    const lines: string[] = [`**[${title}]**`, ''];

    for (const section of sections) {
      lines.push(`- **${section.category}**`);

      for (const item of section.items) {
        lines.push(`    - ${item}`);
      }

      const normalizedMeetings = section.meetings
        .map((meeting) => this.sanitizeLine(meeting))
        .filter(Boolean);

      if (normalizedMeetings.length > 0) {
        lines.push('    - **미팅**');
        for (const meeting of normalizedMeetings) {
          lines.push(`        - ${meeting}`);
        }
      }

      if (section.items.length === 0 && normalizedMeetings.length === 0) {
        lines.push('    - 확인 필요');
      }
    }

    return lines.join('\n').trim();
  }

  private normalizeYmdInput(input?: string): string | null {
    if (!input) return null;
    const matched = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return null;
    return `${matched[1]}-${matched[2]}-${matched[3]}`;
  }

  private getTodayYmdInSeoul(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return `${year}-${month}-${day}`;
  }

  private parseYmdAsUtc(ymd: string): Date {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private pickFirstString(...candidates: unknown[]): string {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
    return '';
  }

  private sanitizeLine(value: string): string {
    return value
      .replace(/^\s*[-*]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripCodeFence(value: string): string {
    const match = value.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
    return match ? match[1].trim() : value;
  }

  private getDuplicateHistoryMessage(type: WeeklyWorkEntryType, weekStartDate: string): string {
    const typeLabel = type === WeeklyWorkEntryType.PLAN ? '주간 계획' : '주간 보고';
    return `${weekStartDate} 주차 ${typeLabel}은(는) 이미 존재합니다. overwriteExisting=false를 해제하면 덮어쓸 수 있습니다.`;
  }

  private isDuplicateEntryError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error as QueryFailedError & { driverError?: { code?: string } };
    return driverError.driverError?.code === 'ER_DUP_ENTRY';
  }
}
