import { Injectable } from '@nestjs/common';
import { MeetingAgentService } from './ai/meeting-agent.service';

export interface ParsedMeetingResult {
  meetingSummary: string;
  actionItems: {
    title: string;
    description?: string;
    assigneeName?: string;
    assigneeId?: string;
    priority?: string;
    dueDate?: string;
    suggestedLabels?: string[];
  }[];
}

@Injectable()
export class MeetingAiService {
  constructor(private readonly agentService: MeetingAgentService) {}

  async parseMinutes(
    projectId: string,
    rawContent: string,
  ): Promise<ParsedMeetingResult> {
    return this.agentService.parseMinutes(projectId, rawContent);
  }
}
