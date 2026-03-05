import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ProjectService } from '../../../project/project.service';

export class GetProjectMembersTool extends StructuredTool {
  name = 'get_project_members';
  description =
    'Get all members of a project. Returns list with userId, name, email, and role. ' +
    'Use this to resolve assignee names from meeting minutes to actual user IDs.';
  schema = z.object({
    projectId: z.string().uuid().describe('The project UUID'),
  });

  private projectService: ProjectService;

  constructor(projectService: ProjectService) {
    super();
    this.projectService = projectService;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const members = await this.projectService.getMembers(input.projectId);
      const simplified = members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }));
      return JSON.stringify(simplified);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return JSON.stringify({ error: message });
    }
  }
}
