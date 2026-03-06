import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DesktopLLM } from './desktop-llm';
import { throwIfAborted } from './parse-cancel';

type MeetingSummaryActionItem = {
  title?: string;
  description?: string;
  assigneeName?: string;
  assigneeNames?: string[];
  dueDate?: string;
  priority?: string;
};

type MeetingSummaryJson = {
  meetingPurpose?: string;
  contextSummary?: string;
  discussionPoints?: string[];
  decisions?: string[];
  risks?: string[];
  followUps?: string[];
  nextMeetingPlan?: {
    suggestedDate?: string;
    agenda?: string[];
  };
  overallSummary?: string;
};

const SUMMARY_TIMEOUT_MS = 120_000;

function truncateText(value: string | undefined, maxLength = 12_000): string {
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function normalizeMarkdownText(value: string | undefined): string {
  return (value || '')
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function toList(values?: string[], fallback = '추가 확인 필요'): string[] {
  const cleaned = (values || [])
    .map((value) => normalizeMarkdownText(value))
    .filter(Boolean);
  if (cleaned.length > 0) return cleaned;
  return [fallback];
}

function toBullet(values?: string[], fallback = '추가 확인 필요'): string {
  return toList(values, fallback)
    .map((value) => {
      const lines = value.split('\n').filter(Boolean);
      if (lines.length <= 1) return `- ${lines[0] ?? value}`;
      return [`- ${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)].join('\n');
    })
    .join('\n');
}

function toInlineCodeBullet(
  values?: string[],
  fallback = '핵심 내용 확인 필요',
): string {
  return toList(values, fallback)
    .map((value) => normalizeMarkdownText(value))
    .filter(Boolean)
    .map((value) => `- \`${value.replaceAll('`', '\\`')}\``)
    .join('\n');
}

@Injectable()
export class MeetingSummaryService {
  private readonly logger = new Logger(MeetingSummaryService.name);
  private readonly llm: DesktopLLM;

  constructor(private readonly config: ConfigService) {
    const desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
    this.llm = new DesktopLLM({ desktopUrl, timeoutMs: SUMMARY_TIMEOUT_MS });
  }

  async summarize(
    meetingTitle: string,
    rawContent: string,
    actionItems: MeetingSummaryActionItem[],
    referenceDate?: string | Date,
    signal?: AbortSignal,
  ): Promise<string> {
    throwIfAborted(signal);
    const prompt = this.buildPrompt(
      meetingTitle,
      rawContent,
      actionItems,
      referenceDate,
    );
    let parsed: MeetingSummaryJson | null = null;

    try {
      const response = await this.llm.invoke(prompt, { signal });
      throwIfAborted(signal);
      parsed = this.parseResponse(response);
    } catch (err) {
      this.logger.warn(`Meeting summary LLM call failed: ${err}`);
      throwIfAborted(signal);
    }

    if (!parsed) {
      this.logger.warn('Meeting summary fallback used due to invalid LLM response');
      return this.buildFallbackSummary(rawContent, actionItems);
    }

    return this.renderSummary(parsed);
  }

  private buildPrompt(
    meetingTitle: string,
    rawContent: string,
    actionItems: MeetingSummaryActionItem[],
    referenceDate?: string | Date,
  ): string {
    const parsedReferenceDate = referenceDate ? new Date(referenceDate) : new Date();
    const referenceDateText = Number.isNaN(parsedReferenceDate.getTime())
      ? new Date().toISOString().slice(0, 10)
      : parsedReferenceDate.toISOString().slice(0, 10);

    const normalizedActionItems = actionItems.map((item, index) => ({
      index: index + 1,
      title: item.title,
      description: item.description,
      assigneeNames: item.assigneeNames?.length
        ? item.assigneeNames
        : item.assigneeName
          ? [item.assigneeName]
          : [],
      dueDate: item.dueDate,
      priority: item.priority,
    }));

    return `You are a senior meeting analyst.
Your job is to generate a high-quality, detailed, and structured meeting summary.

You MUST follow the required JSON schema exactly.
Do NOT output explanations or extra keys outside the JSON.
Output JSON only.

## Inputs
Meeting Title: ${truncateText(meetingTitle, 200)}
Reference Date: ${referenceDateText}

Meeting Minutes (original text):
---
${truncateText(rawContent, 16000)}
---

Extracted Action Items (JSON):
${JSON.stringify(normalizedActionItems, null, 2)}

## Required JSON Schema (exact keys only)
{
  "meetingPurpose": "2-4 sentences, concrete purpose and expected outcome (Markdown inline emphasis allowed)",
  "contextSummary": "3-6 sentences, important background and constraints (Markdown inline emphasis allowed)",
  "discussionPoints": ["5-10 points. Markdown allowed, including inline emphasis and short multi-line list content when needed"],
  "decisions": ["2-8 explicit decisions; if none, write one item saying no final decision yet. Markdown emphasis allowed"],
  "risks": ["1-6 risks/issues/blockers; if none, write one item saying no major risk identified. Markdown emphasis allowed"],
  "followUps": ["3-10 follow-up actions or collaboration requests. Markdown emphasis allowed"],
  "nextMeetingPlan": {
    "suggestedDate": "YYYY-MM-DD or 미정",
    "agenda": ["2-8 agenda items for the next meeting. Markdown emphasis allowed"]
  },
  "overallSummary": "6-10 sentences, narrative summary with key flow and implications (Markdown emphasis and short multi-line structure allowed)"
}

## Markdown Guidance (inside JSON string values only)
1. Use diverse Markdown where emphasis is needed: **bold**, *italic*, ~~strike~~, \`inline code\`.
2. For complex points, you may include short multi-line structures like numbered items (1.) or quoted notes (>), but keep them concise.
3. Do not output HTML.
4. Keep valid JSON (escape new lines as \\n in strings).
5. Apply emphasis only where it improves readability; avoid noisy formatting.

## Hard Constraints
1. Preserve the language of the source minutes.
2. Do not omit required keys.
3. Each array must contain meaningful items, not placeholders.
4. Do not hallucinate names, dates, or decisions not implied by the source.
5. Keep the summary aligned with the meeting purpose and business context.
6. Use specific wording from the meeting when possible, but avoid direct long quotes.
7. If data is uncertain, mark it clearly as tentative in the text.
8. Output valid JSON only.`;
  }

  private parseResponse(response: string): MeetingSummaryJson | null {
    const jsonMatch =
      response.match(/```json\s*([\s\S]*?)```/i) ||
      response.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[1].trim()) as MeetingSummaryJson;
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private renderSummary(summary: MeetingSummaryJson): string {
    const meetingPurpose = normalizeMarkdownText(summary.meetingPurpose) || '회의 목적 확인 필요';
    const contextSummary = normalizeMarkdownText(summary.contextSummary) || '배경 정보 확인 필요';
    const overallSummary = normalizeMarkdownText(summary.overallSummary) || '종합 요약 생성 실패';
    const suggestedDate = normalizeMarkdownText(summary.nextMeetingPlan?.suggestedDate) || '미정';
    const decisionHighlight = toList(summary.decisions, '명시적 최종 의사결정 없음').slice(0, 2);

    return [
      '## 회의 목적',
      meetingPurpose,
      '',
      '---',
      '',
      '## 배경 및 맥락',
      contextSummary,
      '',
      '---',
      '',
      '## 주요 논의 사항',
      toBullet(summary.discussionPoints),
      '',
      '---',
      '',
      '## 의사결정 사항',
      toBullet(summary.decisions, '명시적 최종 의사결정 없음'),
      '',
      '### 결정 하이라이트',
      toInlineCodeBullet(decisionHighlight, '명시적 최종 의사결정 없음'),
      '',
      '---',
      '',
      '## 리스크 및 이슈',
      toBullet(summary.risks, '현재까지 주요 리스크 식별되지 않음'),
      '',
      '---',
      '',
      '## 후속 조치',
      toBullet(summary.followUps),
      '',
      '---',
      '',
      '## 차기 회의 계획',
      `- 제안 일정: ${suggestedDate}`,
      ...toList(summary.nextMeetingPlan?.agenda, '차기 아젠다 추가 필요').map(
        (agenda) => `- 아젠다: ${agenda}`,
      ),
      '',
      '---',
      '',
      '## 종합 요약',
      overallSummary,
    ].join('\n');
  }

  private buildFallbackSummary(
    rawContent: string,
    actionItems: MeetingSummaryActionItem[],
  ): string {
    const actionItemBullets = actionItems.length
      ? actionItems
          .slice(0, 8)
          .map((item) => `- ${normalizeMarkdownText(item.title) || '제목 없는 액션 아이템'}`)
          .join('\n')
      : '- 파싱된 액션 아이템 없음';

    const excerpt = truncateText(rawContent, 1200)
      .split(/\n+/)
      .map((line) => normalizeMarkdownText(line))
      .filter(Boolean)
      .slice(0, 8)
      .map((line) => `- ${line}`)
      .join('\n');

    return [
      '## 회의 목적',
      '원문 기준으로 목적 파악이 필요합니다.',
      '',
      '---',
      '',
      '## 배경 및 맥락',
      'LLM 요약 생성 실패로 원문 기반 임시 요약을 제공합니다.',
      '',
      '---',
      '',
      '## 주요 논의 사항',
      excerpt || '- 원문 내용 확인 필요',
      '',
      '---',
      '',
      '## 의사결정 사항',
      '- 명시적 최종 의사결정 확인 필요',
      '',
      '### 결정 하이라이트',
      toInlineCodeBullet(['명시적 최종 의사결정 확인 필요']),
      '',
      '---',
      '',
      '## 리스크 및 이슈',
      '- 추가 검토 필요',
      '',
      '---',
      '',
      '## 후속 조치',
      actionItemBullets,
      '',
      '---',
      '',
      '## 차기 회의 계획',
      '- 제안 일정: 미정',
      '- 아젠다: 미확정',
      '',
      '---',
      '',
      '## 종합 요약',
      '자동 요약 단계에서 오류가 발생해 임시 요약으로 대체되었습니다.',
    ].join('\n');
  }
}
