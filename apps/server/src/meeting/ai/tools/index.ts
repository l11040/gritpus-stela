import type { StructuredTool } from '@langchain/core/tools';
import type { ProjectService } from '../../../project/project.service';
import type { BoardService } from '../../../board/board.service';
import { GetProjectMembersTool } from './get-project-members.tool';
import { GetBoardsTool } from './get-boards.tool';
import { GetBoardDetailsTool } from './get-board-details.tool';
import { GetCardsTool } from './get-cards.tool';
import { GetLabelsTool } from './get-labels.tool';

export function createMeetingTools(
  projectService: ProjectService,
  boardService: BoardService,
): StructuredTool[] {
  return [
    new GetProjectMembersTool(projectService),
    new GetBoardsTool(boardService),
    new GetBoardDetailsTool(boardService),
    new GetCardsTool(boardService),
    new GetLabelsTool(boardService),
  ];
}
