import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { BoardService } from '../../../board/board.service';

export class GetLabelsTool extends StructuredTool {
  name = 'get_labels';
  description =
    'Get all labels defined in a project. Returns label id, name, and color. ' +
    'Use this to match suggested labels from meeting minutes to existing project labels.';
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
      const labels = await this.boardService.getLabels(input.projectId);
      return JSON.stringify(labels.map((l) => ({ id: l.id, name: l.name, color: l.color })));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return JSON.stringify({ error: message });
    }
  }
}
