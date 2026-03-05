import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DesktopLLM } from './desktop-llm';
import { mapActionItemsWithFuzzyAssignees } from './assignee-matcher';

export type ActionItemAssigneeFields = {
  title?: string;
  description?: string;
  assigneeName?: string;
  assigneeId?: string;
  assigneeNames?: string[];
  assigneeIds?: string[];
};

export type ProjectMemberProfile = {
  userId: string;
  name: string;
  email: string;
};

type AssigneeResolution = {
  index: number;
  assigneeIds?: string[];
  assigneeNames?: string[];
};

type AssigneeResolutionResult = {
  resolutions: AssigneeResolution[];
};

export type ResolveAssigneeOptions = {
  preferExistingIds?: boolean;
};

const RESOLVER_TIMEOUT_MS = 90_000;

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function truncateText(value: string | undefined, maxLength = 800): string | undefined {
  if (!value) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

@Injectable()
export class AssigneeResolverService {
  private readonly logger = new Logger(AssigneeResolverService.name);
  private readonly llm: DesktopLLM;

  constructor(private readonly config: ConfigService) {
    const desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
    this.llm = new DesktopLLM({ desktopUrl, timeoutMs: RESOLVER_TIMEOUT_MS });
  }

  async resolveWithLlm<T extends ActionItemAssigneeFields>(
    items: T[],
    members: ProjectMemberProfile[],
    options?: ResolveAssigneeOptions,
  ): Promise<T[]> {
    if (items.length === 0 || members.length === 0) return items;

    const prompt = this.buildPrompt(items, members);
    let parsed: AssigneeResolutionResult | null = null;

    try {
      const response = await this.llm.invoke(prompt);
      parsed = this.parseResponse(response);
    } catch (err) {
      this.logger.warn(`Assignee resolver LLM call failed: ${err}`);
    }

    if (!parsed) {
      this.logger.warn('Assignee resolver failed to parse LLM output, fallback to fuzzy matcher');
      return mapActionItemsWithFuzzyAssignees(items, members);
    }

    const memberById = new Map(members.map((member) => [member.userId, member]));
    const resolutionByIndex = new Map(
      parsed.resolutions.map((resolution) => [resolution.index, resolution]),
    );

    const llmResolved = items.map((item, index) => {
      const existingValidIds = uniqueStrings([
        ...(item.assigneeIds ?? []),
        ...(item.assigneeId ? [item.assigneeId] : []),
      ]).filter((id) => memberById.has(id));

      const resolution = resolutionByIndex.get(index);
      const llmIds = uniqueStrings(resolution?.assigneeIds ?? []).filter((id) =>
        memberById.has(id),
      );
      const resolvedIds =
        options?.preferExistingIds && existingValidIds.length > 0
          ? existingValidIds
          : llmIds.length > 0
            ? llmIds
            : existingValidIds;

      const namesFromIds = resolvedIds
        .map((id) => memberById.get(id)?.name)
        .filter((value): value is string => !!value);
      const resolvedNames = namesFromIds.length
        ? uniqueStrings(namesFromIds)
        : uniqueStrings([
            ...(resolution?.assigneeNames ?? []),
            ...(item.assigneeNames ?? []),
            ...(item.assigneeName ? [item.assigneeName] : []),
          ]);

      return {
        ...item,
        assigneeId: resolvedIds[0],
        assigneeIds: resolvedIds.length > 0 ? resolvedIds : undefined,
        assigneeName: resolvedNames[0],
        assigneeNames: resolvedNames.length > 0 ? resolvedNames : undefined,
      };
    });

    // LLM 결과를 우선 사용하되, 누락/모호한 케이스는 fuzzy matcher로 한 번 더 보완
    return mapActionItemsWithFuzzyAssignees(llmResolved, members);
  }

  private buildPrompt<T extends ActionItemAssigneeFields>(
    items: T[],
    members: ProjectMemberProfile[],
  ): string {
    const membersPayload = members.map((member) => ({
      userId: member.userId,
      name: member.name,
      email: member.email,
      emailLocalPart: member.email.split('@')[0],
    }));

    const itemsPayload = items.map((item, index) => ({
      index,
      title: truncateText(item.title, 250),
      description: truncateText(item.description, 1000),
      assigneeName: item.assigneeName,
      assigneeNames: item.assigneeNames,
      assigneeId: item.assigneeId,
      assigneeIds: item.assigneeIds,
    }));

    return `You are an assignee resolver for meeting action items.

Your task is to match each action item to project members.
Only use userIds from the provided member list.
Never invent IDs.

## Project Members (JSON)
${JSON.stringify(membersPayload, null, 2)}

## Action Items (JSON)
${JSON.stringify(itemsPayload, null, 2)}

## Matching Rules
1. Resolve assignees using title/description/context + assigneeName/assigneeNames fields.
2. If assigneeIds/assigneeId contains plain text (not UUID), treat it as a hint and map to a real member userId.
3. Support fuzzy matching for typos, short Korean names, and email local-parts.
4. If one assignee is clear, return one ID. If multiple are clearly mentioned, return multiple IDs.
5. If uncertain, return empty assigneeIds.
6. Return one resolution object for every action item index.
7. Output JSON only.

## Output Format
\`\`\`json
{
  "resolutions": [
    {
      "index": 0,
      "assigneeIds": ["uuid"],
      "assigneeNames": ["matched display name"]
    }
  ]
}
\`\`\``;
  }

  private parseResponse(response: string): AssigneeResolutionResult | null {
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)```/i) ||
      response.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1].trim()) as AssigneeResolutionResult;
      if (!parsed || !Array.isArray(parsed.resolutions)) return null;

      const resolutions: AssigneeResolution[] = parsed.resolutions
        .map((resolution) => ({
          index: Number(resolution?.index),
          assigneeIds: Array.isArray(resolution?.assigneeIds)
            ? uniqueStrings(
                resolution.assigneeIds.filter(
                  (value): value is string => typeof value === 'string',
                ),
              )
            : [],
          assigneeNames: Array.isArray(resolution?.assigneeNames)
            ? uniqueStrings(
                resolution.assigneeNames.filter(
                  (value): value is string => typeof value === 'string',
                ),
              )
            : [],
        }))
        .filter((resolution) => Number.isInteger(resolution.index) && resolution.index >= 0);

      return { resolutions };
    } catch {
      return null;
    }
  }
}
