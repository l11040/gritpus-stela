import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SUMMARY_TIMEOUT_MS = 120_000;

interface SummaryResult {
  slideCount: number;
  estimatedDuration: string;
  keyMessages: string[];
  audienceNotes: string;
  suggestedFlow: { section: string; description: string; slides: number }[];
  tableOfContents: { title: string; level: number }[];
  estimatedReadTime: number;
}

@Injectable()
export class MdDocumentSummaryService {
  private readonly logger = new Logger(MdDocumentSummaryService.name);
  private readonly desktopUrl: string;

  constructor(private readonly config: ConfigService) {
    this.desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
  }

  async summarize(content: string): Promise<SummaryResult> {
    const toc = this.extractToc(content);
    const readTime = this.estimateReadTime(content);

    const prompt = this.buildPrompt(content);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error('LLM request timed out')),
        SUMMARY_TIMEOUT_MS,
      );

      const res = await fetch(`${this.desktopUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Desktop service error (${res.status})`);
      }

      const data = (await res.json()) as { response: string };
      const analysis = this.parseAnalysis(data.response);

      return {
        ...analysis,
        tableOfContents: toc,
        estimatedReadTime: readTime,
      };
    } catch (err) {
      this.logger.warn(`Document summary LLM call failed: ${err}`);
      return {
        slideCount: toc.filter((h) => h.level <= 2).length + 2,
        estimatedDuration: `${readTime * 2}분`,
        keyMessages: ['분석 생성에 실패했습니다. 원본 문서를 확인해주세요.'],
        audienceNotes: '',
        suggestedFlow: [],
        tableOfContents: toc,
        estimatedReadTime: readTime,
      };
    }
  }

  private buildPrompt(content: string): string {
    const truncated =
      content.length > 16000 ? content.slice(0, 16000) + '...' : content;

    return `You are a presentation coach and document analyst. Analyze the following markdown document and prepare a presentation analysis.

## Document
---
${truncated}
---

## Instructions
Analyze this document for presentation preparation. Output ONLY a JSON object (no other text) with the following structure:

{
  "slideCount": <recommended total number of slides>,
  "estimatedDuration": "<estimated presentation time, e.g. '15분'>",
  "keyMessages": ["핵심 메시지 1", "핵심 메시지 2", ...],
  "audienceNotes": "<audience analysis and tips for the presenter>",
  "suggestedFlow": [
    { "section": "도입", "description": "배경 설명 및 목적 제시", "slides": 2 },
    { "section": "본론", "description": "핵심 내용 전개", "slides": 4 },
    { "section": "결론", "description": "요약 및 다음 단계", "slides": 2 }
  ]
}

Rules:
1. All text must be in the same language as the document.
2. keyMessages should have 3-7 items, each a concise sentence.
3. suggestedFlow should break the document into logical presentation sections.
4. audienceNotes should include who the target audience is and presentation tips.
5. Output ONLY the JSON object, no markdown code fences or other text.`;
  }

  private parseAnalysis(
    response: string,
  ): Omit<SummaryResult, 'tableOfContents' | 'estimatedReadTime'> {
    const fallback = {
      slideCount: 8,
      estimatedDuration: '15분',
      keyMessages: ['분석을 파싱할 수 없습니다.'],
      audienceNotes: '',
      suggestedFlow: [],
    };

    try {
      const jsonMatch =
        response.match(/\{[\s\S]*\}/) ||
        response.match(/```json\s*([\s\S]*?)```/i);
      if (!jsonMatch) return fallback;

      const text = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(text.trim());

      return {
        slideCount:
          typeof parsed.slideCount === 'number' ? parsed.slideCount : 8,
        estimatedDuration:
          typeof parsed.estimatedDuration === 'string'
            ? parsed.estimatedDuration
            : '15분',
        keyMessages: Array.isArray(parsed.keyMessages)
          ? parsed.keyMessages.filter(
              (m: unknown) => typeof m === 'string',
            )
          : fallback.keyMessages,
        audienceNotes:
          typeof parsed.audienceNotes === 'string'
            ? parsed.audienceNotes
            : '',
        suggestedFlow: Array.isArray(parsed.suggestedFlow)
          ? parsed.suggestedFlow
          : [],
      };
    } catch {
      return fallback;
    }
  }

  private extractToc(
    content: string,
  ): { title: string; level: number }[] {
    const toc: { title: string; level: number }[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        toc.push({ title: match[2].trim(), level: match[1].length });
      }
    }
    return toc;
  }

  private estimateReadTime(content: string): number {
    const words = content
      .replace(/[#*`\[\]()>_~-]/g, '')
      .split(/\s+/)
      .filter(Boolean).length;
    // Average reading speed ~200 words/min for Korean
    return Math.max(1, Math.round(words / 200));
  }
}
