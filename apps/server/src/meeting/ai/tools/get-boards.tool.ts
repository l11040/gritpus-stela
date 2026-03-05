import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { BoardService } from '../../../board/board.service';

export class GetBoardsTool extends StructuredTool {
  name = 'get_boards';
  description =
    'List all boards in a project. Returns board id, name, description, and column names. ' +
    'Use this to identify which board to assign action items to.';
  schema = z.object({
    projectId: z.string().uuid().describe('The project UUID'),
  });

  private boardService: BoardService;

  constructor(boardService: BoardService) {
    super();
    this.boardService = boardService;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const boards = await this.boardService.getBoards(input.projectId);
      const simplified = boards.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        columns: b.columns.map((c) => ({ id: c.id, name: c.name })),
      }));
      return JSON.stringify(simplified);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return JSON.stringify({ error: message });
    }
  }
}
