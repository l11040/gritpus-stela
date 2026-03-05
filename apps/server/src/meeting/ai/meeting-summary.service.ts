import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DesktopLLM } from './desktop-llm';

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

function normalizeLine(value: string | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

function toList(values?: string[], fallback = '추가 확인 필요'): string[] {
  const cleaned = (values || [])
    .map((value) => normalizeLine(value))
    .filter(Boolean);
  if (cleaned.length > 0) return cleaned;
  return [fallback];
}

function toBullet(values?: string[], fallback = '추가 확인 필요'): string {
  return toList(values, fallback).map((value) => `- ${value}`).join('\n');
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
  ): Promise<string> {
    const prompt = this.buildPrompt(
      meetingTitle,
      rawContent,
      actionItems,
      referenceDate,
    );
    let parsed: MeetingSummaryJson | null = null;

    try {
      const response = await this.llm.invoke(prompt);
      parsed = this.parseResponse(response);
    } catch (err) {
      this.logger.warn(`Meeting summary LLM call failed: ${err}`);
    }

    if (!parsed) {
      this.logger.warn('Meeting summary fallback used due to invalid LLM response');
      return this.buildFallbackSummary(meetingTitle, rawContent, actionItems);
    }

    return this.renderSummary(parsed, meetingTitle);
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
Do NOT output markdown, explanations, or extra keys.
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
  "meetingPurpose": "2-4 sentences, concrete purpose and expected outcome",
  "contextSummary": "3-6 sentences, important background and constraints",
  "discussionPoints": ["5-10 bullet-level points, each one sentence minimum"],
  "decisions": ["2-8 explicit decisions; if none, write one item saying no final decision yet"],
  "risks": ["1-6 risks/issues/blockers; if none, write one item saying no major risk identified"],
  "followUps": ["3-10 follow-up actions or collaboration requests"],
  "nextMeetingPlan": {
    "suggestedDate": "YYYY-MM-DD or 미정",
    "agenda": ["2-8 agenda items for the next meeting"]
  },
  "overallSummary": "6-10 sentences, narrative summary with key flow and implications"
}

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

  private renderSummary(summary: MeetingSummaryJson, meetingTitle: string): string {
    const meetingPurpose = normalizeLine(summary.meetingPurpose) || '회의 목적 확인 필요';
    const contextSummary = normalizeLine(summary.contextSummary) || '배경 정보 확인 필요';
    const overallSummary = normalizeLine(summary.overallSummary) || '종합 요약 생성 실패';
    const suggestedDate = normalizeLine(summary.nextMeetingPlan?.suggestedDate) || '미정';

    return [
      `회의 정리: ${meetingTitle}`,
      '',
      '1) 회의 목적',
      meetingPurpose,
      '',
      '2) 배경 및 맥락',
      contextSummary,
      '',
      '3) 주요 논의 사항',
      toBullet(summary.discussionPoints),
      '',
      '4) 의사결정 사항',
      toBullet(summary.decisions, '명시적 최종 의사결정 없음'),
      '',
      '5) 리스크 및 이슈',
      toBullet(summary.risks, '현재까지 주요 리스크 식별되지 않음'),
      '',
      '6) 후속 조치',
      toBullet(summary.followUps),
      '',
      '7) 차기 회의 계획',
      `- 제안 일정: ${suggestedDate}`,
      ...toList(summary.nextMeetingPlan?.agenda, '차기 아젠다 추가 필요').map(
        (agenda) => `- 아젠다: ${agenda}`,
      ),
      '',
      '8) 종합 요약',
      overallSummary,
    ].join('\n');
  }

  private buildFallbackSummary(
    meetingTitle: string,
    rawContent: string,
    actionItems: MeetingSummaryActionItem[],
  ): string {
    const actionItemBullets = actionItems.length
      ? actionItems
          .slice(0, 8)
          .map((item) => `- ${normalizeLine(item.title) || '제목 없는 액션 아이템'}`)
          .join('\n')
      : '- 파싱된 액션 아이템 없음';

    const excerpt = truncateText(rawContent, 1200)
      .split(/\n+/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
      .slice(0, 8)
      .map((line) => `- ${line}`)
      .join('\n');

    return [
      `회의 정리: ${meetingTitle}`,
      '',
      '1) 회의 목적',
      '원문 기준으로 목적 파악이 필요합니다.',
      '',
      '2) 배경 및 맥락',
      'LLM 요약 생성 실패로 원문 기반 임시 요약을 제공합니다.',
      '',
      '3) 주요 논의 사항',
      excerpt || '- 원문 내용 확인 필요',
      '',
      '4) 의사결정 사항',
      '- 명시적 최종 의사결정 확인 필요',
      '',
      '5) 리스크 및 이슈',
      '- 추가 검토 필요',
      '',
      '6) 후속 조치',
      actionItemBullets,
      '',
      '7) 차기 회의 계획',
      '- 제안 일정: 미정',
      '- 아젠다: 미확정',
      '',
      '8) 종합 요약',
      '자동 요약 단계에서 오류가 발생해 임시 요약으로 대체되었습니다.',
    ].join('\n');
  }
}
