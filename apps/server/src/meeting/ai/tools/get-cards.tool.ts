import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { BoardService } from '../../../board/board.service';

export class GetCardsTool extends StructuredTool {
  name = 'get_cards';
  description =
    'Get cards from a board with optional filters by assignee, priority, or label. ' +
    'Use this to check for duplicate action items or understand workload distribution.';
  schema = z.object({
    boardId: z.string().uuid().describe('The board UUID'),
    assigneeId: z.string().uuid().optional().describe('Filter by assignee user ID'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Filter by priority'),
    labelId: z.string().uuid().optional().describe('Filter by label ID'),
  });

  private boardService: BoardService;

  constructor(boardService: BoardService) {
    super();
    this.boardService = boardService;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const cards = await this.boardService.getCards(input.boardId, {
        assigneeId: input.assigneeId,
        priority: input.priority,
        labelId: input.labelId,
      });
      const simplified = cards.map((c) => ({
        id: c.id,
        title: c.title,
        priority: c.priority,
        assignees: c.assignees?.map((a) => a.name) ?? [],
        labels: c.labels?.map((l) => l.name) ?? [],
      }));
      return JSON.stringify(simplified);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return JSON.stringify({ error: message });
    }
  }
}
