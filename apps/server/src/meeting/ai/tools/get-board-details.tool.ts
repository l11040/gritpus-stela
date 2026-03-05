import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { BoardService } from '../../../board/board.service';

export class GetBoardDetailsTool extends StructuredTool {
  name = 'get_board_details';
  description =
    'Get detailed information about a specific board, including all columns and their cards. ' +
    'Use this to understand the current state of a board before assigning new action items.';
  schema = z.object({
    boardId: z.string().uuid().describe('The board UUID'),
  });

  private boardService: BoardService;

  constructor(boardService: BoardService) {
    super();
    this.boardService = boardService;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const board = await this.boardService.getBoard(input.boardId);
      const simplified = {
        id: board.id,
        name: board.name,
        columns: board.columns.map((c) => ({
          id: c.id,
          name: c.name,
          cardCount: c.cards?.length ?? 0,
          cards: (c.cards ?? []).slice(0, 10).map((card) => ({
            id: card.id,
            title: card.title,
            assignees: card.assignees?.map((a) => a.name) ?? [],
            priority: card.priority,
          })),
        })),
      };
      return JSON.stringify(simplified);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return JSON.stringify({ error: message });
    }
  }
}
