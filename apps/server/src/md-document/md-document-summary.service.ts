import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SUMMARY_TIMEOUT_MS = 120_000;

interface SummaryResult {
  keyPoints: string[];
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
      const keyPoints = this.parseKeyPoints(data.response);

      return { keyPoints, tableOfContents: toc, estimatedReadTime: readTime };
    } catch (err) {
      this.logger.warn(`Document summary LLM call failed: ${err}`);
      return {
        keyPoints: ['요약 생성에 실패했습니다. 원본 문서를 확인해주세요.'],
        tableOfContents: toc,
        estimatedReadTime: readTime,
      };
    }
  }

  private buildPrompt(content: string): string {
    const truncated =
      content.length > 16000 ? content.slice(0, 16000) + '...' : content;

    return `You are a document analyst. Analyze the following markdown document and extract 3-7 key points.

## Document
---
${truncated}
---

## Instructions
1. Extract 3-7 key points that summarize the document's most important information.
2. Each key point should be a concise sentence in the same language as the document.
3. Output ONLY a JSON array of strings, no other text.

Example output:
["첫 번째 핵심 포인트", "두 번째 핵심 포인트", "세 번째 핵심 포인트"]`;
  }

  private parseKeyPoints(response: string): string[] {
    try {
      const jsonMatch =
        response.match(/\[[\s\S]*?\]/) ||
        response.match(/```json\s*([\s\S]*?)```/i);
      if (!jsonMatch) return ['요약을 파싱할 수 없습니다.'];

      const text = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
        return parsed;
      }
      return ['요약을 파싱할 수 없습니다.'];
    } catch {
      return ['요약을 파싱할 수 없습니다.'];
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
