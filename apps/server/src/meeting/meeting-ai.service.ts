import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ParsedMeetingResult {
  meetingSummary: string;
  actionItems: {
    title: string;
    description?: string;
    assigneeName?: string;
    priority?: string;
    dueDate?: string;
    suggestedLabels?: string[];
  }[];
}

const SYSTEM_PROMPT = `당신은 회의록 분석 전문가입니다. 주어진 회의록에서 액션 아이템을 추출해야 합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:

{
  "meetingSummary": "회의 요약 (1-2문장)",
  "actionItems": [
    {
      "title": "액션 아이템 제목 (간결하게)",
      "description": "상세 설명 (회의 맥락 포함)",
      "assigneeName": "담당자 이름 (언급된 경우)",
      "priority": "low|medium|high|urgent",
      "dueDate": "YYYY-MM-DD (언급된 경우)",
      "suggestedLabels": ["태그1", "태그2"]
    }
  ]
}

규칙:
1. 어떤 형식의 회의록이든 (한국어, 영어, 혼합) 분석 가능
2. 모든 액션 아이템, 태스크, 후속 조치를 식별
3. 우선순위는 긴급도/중요도 단서를 기반으로 판단
4. 모호한 경우 더 많은 아이템을 추출
5. 원본 언어를 유지`;

@Injectable()
export class MeetingAiService {
  private readonly desktopUrl: string;

  constructor(private readonly config: ConfigService) {
    this.desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
  }

  async parseMinutes(rawContent: string): Promise<ParsedMeetingResult> {
    const prompt = `${SYSTEM_PROMPT}\n\n--- 회의록 ---\n${rawContent}\n--- 회의록 끝 ---\n\nJSON으로 응답하세요:`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    try {
      const res = await fetch(`${this.desktopUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new HttpException(
          'AI 서비스 오류',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await res.json();
      const responseText: string = data.response;

      // JSON 블록 추출 (```json ... ``` 또는 직접 JSON)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ||
                        responseText.match(/(\{[\s\S]*\})/);

      if (!jsonMatch) {
        throw new HttpException(
          'AI 응답에서 JSON을 추출할 수 없습니다.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const parsed = JSON.parse(jsonMatch[1].trim()) as ParsedMeetingResult;

      if (!parsed.actionItems || !Array.isArray(parsed.actionItems)) {
        throw new HttpException(
          'AI 응답 형식이 올바르지 않습니다.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      return parsed;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new HttpException(
        `AI 파싱 실패: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
