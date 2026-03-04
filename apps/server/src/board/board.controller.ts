import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { BoardService } from './board.service';
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CombinedAuthGuard } from '../common/guards/combined-auth.guard';

// ─── 보드 컨트롤러 (JWT 인증) ───

@ApiTags('boards')
@Controller('projects/:projectId/boards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  @ApiOperation({ summary: '보드 생성' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateBoardDto) {
    return this.boardService.createBoard(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: '보드 목록' })
  findAll(@Param('projectId') projectId: string) {
    return this.boardService.getBoards(projectId);
  }

  @Get(':boardId')
  @ApiOperation({ summary: '보드 상세 (컬럼/카드 포함)' })
  findOne(@Param('boardId') boardId: string) {
    return this.boardService.getBoard(boardId);
  }

  @Patch(':boardId')
  @ApiOperation({ summary: '보드 수정' })
  update(@Param('boardId') boardId: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.updateBoard(boardId, dto);
  }

  @Delete(':boardId')
  @ApiOperation({ summary: '보드 삭제' })
  remove(@Param('boardId') boardId: string) {
    return this.boardService.deleteBoard(boardId);
  }

  // ─── 컬럼 ───

  @Post(':boardId/columns')
  @ApiOperation({ summary: '컬럼 추가' })
  createColumn(@Param('boardId') boardId: string, @Body() dto: CreateColumnDto) {
    return this.boardService.createColumn(boardId, dto);
  }

  @Patch(':boardId/columns/:columnId')
  @ApiOperation({ summary: '컬럼 수정' })
  updateColumn(@Param('columnId') columnId: string, @Body() dto: UpdateColumnDto) {
    return this.boardService.updateColumn(columnId, dto);
  }

  @Delete(':boardId/columns/:columnId')
  @ApiOperation({ summary: '컬럼 삭제' })
  deleteColumn(@Param('columnId') columnId: string) {
    return this.boardService.deleteColumn(columnId);
  }

  @Patch(':boardId/columns/reorder')
  @ApiOperation({ summary: '컬럼 순서 변경' })
  reorderColumns(@Body() dto: ReorderDto) {
    return this.boardService.reorderColumns(dto);
  }

  // ─── 카드 ───

  @Post(':boardId/cards')
  @ApiOperation({ summary: '카드 생성' })
  createCard(@Body() dto: CreateCardDto) {
    return this.boardService.createCard(dto);
  }

  @Get(':boardId/cards')
  @ApiOperation({ summary: '카드 목록 (필터링)' })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'labelId', required: false })
  getCards(
    @Param('boardId') boardId: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('labelId') labelId?: string,
  ) {
    return this.boardService.getCards(boardId, { assigneeId, priority, labelId });
  }

  @Get(':boardId/cards/:cardId')
  @ApiOperation({ summary: '카드 상세' })
  getCard(@Param('cardId') cardId: string) {
    return this.boardService.getCard(cardId);
  }

  @Patch(':boardId/cards/:cardId')
  @ApiOperation({ summary: '카드 수정' })
  updateCard(@Param('cardId') cardId: string, @Body() dto: UpdateCardDto) {
    return this.boardService.updateCard(cardId, dto);
  }

  @Delete(':boardId/cards/:cardId')
  @ApiOperation({ summary: '카드 삭제' })
  deleteCard(@Param('cardId') cardId: string) {
    return this.boardService.deleteCard(cardId);
  }

  @Patch(':boardId/cards/:cardId/move')
  @ApiOperation({ summary: '카드 이동 (드래그앤드롭)' })
  moveCard(@Param('cardId') cardId: string, @Body() dto: MoveCardDto) {
    return this.boardService.moveCard(cardId, dto);
  }

  @Post(':boardId/cards/batch')
  @ApiOperation({ summary: '카드 일괄 생성' })
  batchCreateCards(@Body() dto: BatchCreateCardDto) {
    return this.boardService.batchCreateCards(dto);
  }
}

// ─── 라벨 컨트롤러 ───

@ApiTags('labels')
@Controller('projects/:projectId/labels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LabelController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  @ApiOperation({ summary: '라벨 생성' })
  create(@Param('projectId') projectId: string, @Body() dto: CreateLabelDto) {
    return this.boardService.createLabel(projectId, dto);
  }

  @Get()
  @ApiOperation({ summary: '라벨 목록' })
  findAll(@Param('projectId') projectId: string) {
    return this.boardService.getLabels(projectId);
  }

  @Patch(':labelId')
  @ApiOperation({ summary: '라벨 수정' })
  update(@Param('labelId') labelId: string, @Body() dto: UpdateLabelDto) {
    return this.boardService.updateLabel(labelId, dto);
  }

  @Delete(':labelId')
  @ApiOperation({ summary: '라벨 삭제' })
  remove(@Param('labelId') labelId: string) {
    return this.boardService.deleteLabel(labelId);
  }
}

// ─── 외부 API 컨트롤러 (API Key 인증) ───

@ApiTags('external')
@Controller('external')
export class ExternalController {
  constructor(private readonly boardService: BoardService) {}

  @Post('cards')
  @UseGuards(CombinedAuthGuard)
  @ApiHeader({ name: 'x-api-key', description: 'API Key 인증', required: false })
  @ApiBearerAuth()
  @ApiOperation({ summary: '외부에서 카드 일괄 등록 (API Key 또는 JWT)' })
  @ApiResponse({ status: 201, description: '카드 생성 완료' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  externalBatchCreate(@Body() dto: ExternalBatchCreateDto) {
    return this.boardService.externalBatchCreate(dto);
  }
}
