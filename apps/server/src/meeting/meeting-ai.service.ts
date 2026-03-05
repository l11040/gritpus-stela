import { Injectable } from '@nestjs/common';
import { MeetingAgentService } from './ai/meeting-agent.service';
import {
  AssigneeResolverService,
  type ActionItemAssigneeFields,
  type ProjectMemberProfile,
  type ResolveAssigneeOptions,
} from './ai/assignee-resolver.service';
import { MeetingSummaryService } from './ai/meeting-summary.service';

export interface ParsedMeetingResult {
  meetingSummary: string;
  actionItems: {
    title: string;
    description?: string;
    assigneeName?: string;
    assigneeId?: string;
    assigneeNames?: string[];
    assigneeIds?: string[];
    priority?: string;
    dueDate?: string;
    suggestedLabels?: string[];
  }[];
}

export type AgentProgressCallback = (event: {
  step: 'agent_iteration' | 'agent_tool';
  message: string;
  detail?: string;
  iteration?: number;
  maxIterations?: number;
}) => void;

@Injectable()
export class MeetingAiService {
  constructor(
    private readonly agentService: MeetingAgentService,
    private readonly assigneeResolverService: AssigneeResolverService,
    private readonly meetingSummaryService: MeetingSummaryService,
  ) {}

  async parseMinutes(
    projectId: string,
    rawContent: string,
    referenceDate?: string | Date,
    onProgress?: AgentProgressCallback,
  ): Promise<ParsedMeetingResult> {
    return this.agentService.parseMinutes(projectId, rawContent, referenceDate, onProgress);
  }

  async resolveActionItemsAssignees<T extends ActionItemAssigneeFields>(
    actionItems: T[],
    projectMembers: ProjectMemberProfile[],
    options?: ResolveAssigneeOptions,
  ): Promise<T[]> {
    return this.assigneeResolverService.resolveWithLlm(
      actionItems,
      projectMembers,
      options,
    );
  }

  async summarizeMeetingMinutes<T extends ActionItemAssigneeFields>(
    meetingTitle: string,
    rawContent: string,
    actionItems: T[],
    referenceDate?: string | Date,
  ): Promise<string> {
    return this.meetingSummaryService.summarize(
      meetingTitle,
      rawContent,
      actionItems,
      referenceDate,
    );
  }
}
