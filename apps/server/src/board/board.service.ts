import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Board } from './entities/board.entity';
import { BoardColumn } from './entities/column.entity';
import { Card } from './entities/card.entity';
import { Label } from './entities/label.entity';
import { User } from '../auth/entities/user.entity';
import {
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
  ReorderDto,
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  BatchCreateCardDto,
  CreateLabelDto,
  UpdateLabelDto,
  ExternalBatchCreateDto,
} from './board.dto';

const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#3B82F6', position: 0 },
  { name: 'In Progress', color: '#F59E0B', position: 1 },
  { name: 'Done', color: '#10B981', position: 2 },
];

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(BoardColumn)
    private readonly columnRepo: Repository<BoardColumn>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    @InjectRepository(Label)
    private readonly labelRepo: Repository<Label>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Board CRUD ───

  async createBoard(projectId: string, dto: CreateBoardDto): Promise<Board> {
    const count = await this.boardRepo.count({ where: { projectId } });
    const board = this.boardRepo.create({ ...dto, projectId, position: count });
    const saved = await this.boardRepo.save(board);

    const columns = DEFAULT_COLUMNS.map((col) =>
      this.columnRepo.create({ ...col, boardId: saved.id }),
    );
    await this.columnRepo.save(columns);

    return this.getBoard(saved.id);
  }

  async getBoards(projectId: string): Promise<Board[]> {
    return this.boardRepo.find({
      where: { projectId },
      relations: ['columns'],
      order: { position: 'ASC' },
    });
  }

  async getBoard(boardId: string): Promise<Board> {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      relations: ['columns', 'columns.cards', 'columns.cards.assignee', 'columns.cards.labels'],
      order: { columns: { position: 'ASC', cards: { position: 'ASC' } } },
    });
    if (!board) throw new NotFoundException('보드를 찾을 수 없습니다.');
    return board;
  }

  async updateBoard(boardId: string, dto: UpdateBoardDto): Promise<Board> {
    await this.boardRepo.update(boardId, dto);
    return this.getBoard(boardId);
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.boardRepo.delete(boardId);
  }

  // ─── Column CRUD ───

  async createColumn(boardId: string, dto: CreateColumnDto): Promise<BoardColumn> {
    const count = await this.columnRepo.count({ where: { boardId } });
    const column = this.columnRepo.create({ ...dto, boardId, position: count });
    return this.columnRepo.save(column);
  }

  async updateColumn(columnId: string, dto: UpdateColumnDto): Promise<BoardColumn> {
    await this.columnRepo.update(columnId, dto);
    return this.columnRepo.findOneOrFail({ where: { id: columnId } });
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.columnRepo.delete(columnId);
  }

  async reorderColumns(dto: ReorderDto): Promise<void> {
    await Promise.all(
      dto.orderedIds.map((id, index) => this.columnRepo.update(id, { position: index })),
    );
  }

  // ─── Card CRUD ───

  async createCard(dto: CreateCardDto): Promise<Card> {
    const count = await this.cardRepo.count({ where: { columnId: dto.columnId } });
    const card = this.cardRepo.create({
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      columnId: dto.columnId,
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      position: count,
    });
    const saved = await this.cardRepo.save(card);

    if (dto.labelIds?.length) {
      const labels = await this.labelRepo.find({ where: { id: In(dto.labelIds) } });
      saved.labels = labels;
      await this.cardRepo.save(saved);
    }

    return this.getCard(saved.id);
  }

  async getCards(boardId: string, filters?: {
    assigneeId?: string;
    priority?: string;
    labelId?: string;
  }): Promise<Card[]> {
    const qb = this.cardRepo
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.assignee', 'assignee')
      .leftJoinAndSelect('card.labels', 'label')
      .innerJoin('card.column', 'column')
      .where('column.boardId = :boardId', { boardId });

    if (filters?.assigneeId) {
      qb.andWhere('card.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters?.priority) {
      qb.andWhere('card.priority = :priority', { priority: filters.priority });
    }
    if (filters?.labelId) {
      qb.andWhere('label.id = :labelId', { labelId: filters.labelId });
    }

    return qb.orderBy('card.position', 'ASC').getMany();
  }

  async getCard(cardId: string): Promise<Card> {
    const card = await this.cardRepo.findOne({
      where: { id: cardId },
      relations: ['assignee', 'labels', 'column'],
    });
    if (!card) throw new NotFoundException('카드를 찾을 수 없습니다.');
    return card;
  }

  async updateCard(cardId: string, dto: UpdateCardDto): Promise<Card> {
    const card = await this.getCard(cardId);

    if (dto.labelIds) {
      const labels = await this.labelRepo.find({ where: { id: In(dto.labelIds) } });
      card.labels = labels;
    }

    const { labelIds, ...rest } = dto;
    Object.assign(card, {
      ...rest,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : card.dueDate,
    });
    await this.cardRepo.save(card);
    return this.getCard(cardId);
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.cardRepo.delete(cardId);
  }

  async moveCard(cardId: string, dto: MoveCardDto): Promise<Card> {
    await this.cardRepo.update(cardId, {
      columnId: dto.columnId,
      position: dto.position,
    });

    // 대상 컬럼의 다른 카드 위치 재정렬
    const cards = await this.cardRepo.find({
      where: { columnId: dto.columnId },
      order: { position: 'ASC' },
    });
    await Promise.all(
      cards.map((card, index) => this.cardRepo.update(card.id, { position: index })),
    );

    return this.getCard(cardId);
  }

  async batchCreateCards(dto: BatchCreateCardDto): Promise<Card[]> {
    const results: Card[] = [];
    for (const cardDto of dto.cards) {
      const card = await this.createCard(cardDto);
      results.push(card);
    }
    return results;
  }

  // ─── 외부 JSON API (API Key 인증) ───

  async externalBatchCreate(dto: ExternalBatchCreateDto): Promise<Card[]> {
    const board = await this.getBoard(dto.boardId);
    const results: Card[] = [];

    for (const item of dto.items) {
      // 컬럼 찾기: columnName으로 매칭, 없으면 첫 번째 컬럼
      let targetColumn = board.columns[0];
      if (item.columnName) {
        const found = board.columns.find(
          (col) => col.name.toLowerCase() === item.columnName!.toLowerCase(),
        );
        if (found) targetColumn = found;
      }

      // assignee 찾기: 이메일로 매칭
      let assigneeId: string | undefined;
      if (item.assigneeEmail) {
        const user = await this.userRepo.findOne({ where: { email: item.assigneeEmail } });
        if (user) assigneeId = user.id;
      }

      const card = await this.createCard({
        title: item.title,
        description: item.description,
        priority: item.priority,
        columnId: targetColumn.id,
        assigneeId,
        dueDate: item.dueDate,
      });
      results.push(card);
    }

    return results;
  }

  // ─── Label CRUD ───

  async createLabel(projectId: string, dto: CreateLabelDto): Promise<Label> {
    const label = this.labelRepo.create({ ...dto, projectId });
    return this.labelRepo.save(label);
  }

  async getLabels(projectId: string): Promise<Label[]> {
    return this.labelRepo.find({ where: { projectId } });
  }

  async updateLabel(labelId: string, dto: UpdateLabelDto): Promise<Label> {
    await this.labelRepo.update(labelId, dto);
    return this.labelRepo.findOneOrFail({ where: { id: labelId } });
  }

  async deleteLabel(labelId: string): Promise<void> {
    await this.labelRepo.delete(labelId);
  }
}
