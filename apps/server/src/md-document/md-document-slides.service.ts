import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SLIDES_TIMEOUT_MS = 120_000;

export interface SlidesJson {
  meta: {
    title: string;
    subtitle: string;
  };
  slides: SlideItem[];
}

type SlideItem =
  | { type: 'title'; title: string; subtitle: string }
  | { type: 'toc'; cards: { num: string; title: string; desc: string; slide: number }[] }
  | { type: 'section'; num: string; title: string; subtitle: string }
  | { type: 'content'; title: string; subtitle: string; elements: unknown[] };

@Injectable()
export class MdDocumentSlidesService {
  private readonly logger = new Logger(MdDocumentSlidesService.name);
  private readonly desktopUrl: string;

  constructor(private readonly config: ConfigService) {
    this.desktopUrl = this.config.get<string>(
      'DESKTOP_SERVICE_URL',
      'http://localhost:50004',
    );
  }

  async generateSlides(content: string): Promise<SlidesJson> {
    const prompt = this.buildPrompt(content);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(new Error('LLM request timed out')),
        SLIDES_TIMEOUT_MS,
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
      return this.parseSlides(data.response);
    } catch (err) {
      this.logger.warn(`Slides generation LLM call failed: ${err}`);
      return this.fallbackSlides(content);
    }
  }

  private buildPrompt(content: string): string {
    const truncated =
      content.length > 16000 ? content.slice(0, 16000) + '...' : content;

    return `You are a professional presentation designer. Convert the markdown document below into a rich, multi-slide presentation JSON.

<document>
${truncated}
</document>

Output ONLY a valid JSON object with this exact schema (no markdown fences, no explanation):

{
  "meta": { "title": "string", "subtitle": "string" },
  "slides": [ ... ]
}

Slide types (use ALL of them):

1. Title slide (exactly 1, first):
   { "type": "title", "title": "...", "subtitle": "..." }

2. TOC slide (exactly 1, second):
   { "type": "toc", "cards": [{ "num": "1", "title": "...", "desc": "...", "slide": 4 }] }
   - "slide" must point to the actual slide index (1-based) of that section's first slide.

3. Section divider (one per major section):
   { "type": "section", "num": "01", "title": "...", "subtitle": "..." }

4. Content slides (multiple per section):
   { "type": "content", "title": "...", "subtitle": "...", "elements": [ ... ] }

Available element types for content slides:
- ["p", "paragraph text"]
- ["h3", "sub heading"]
- ["ul", ["item1", "item2"]]
- ["ol", ["item1", "item2"]]
- ["list", { "items": ["a", "b"], "ordered": false }]
- ["table", { "headers": ["H1", "H2"], "rows": [["c1", "c2"]], "compact": false }]
- ["code", "code string"]
- ["highlight-box", "important info"]
- ["warning-box", "warning text"]
- ["flow", { "steps": ["A", "→", "B", "→", "C"], "highlight": 0 }]
- ["card-grid", { "cols": 2, "cards": [{ "title": "t", "body": "b" }] }]
- ["cols", { "columns": [[["h3","Left"],["p","..."]], [["h3","Right"],["p","..."]]] }]
- ["badges", [{ "text": "label", "color": "blue" }]]
- ["mermaid", "graph TD\\n    A[Start] --> B[End]"]  (use for flowcharts, sequence diagrams, etc. from the document)

CRITICAL RULES:
1. Generate 8-20 slides total. NEVER generate fewer than 6 slides.
2. Each content slide should have 2-5 elements. Don't overload.
3. Use diverse element types — tables, lists, card-grid, highlight-box, flow, cols, mermaid. Do NOT just use "p" elements.
4. Every major heading in the document becomes a section with at least 2 content slides.
5. All text must be in the same language as the document.
6. Output ONLY the raw JSON object. No markdown, no code fences, no commentary.
7. If the document contains mermaid diagrams (in \`\`\`mermaid code blocks), include them as ["mermaid", "..."] elements. You may also CREATE new mermaid diagrams to visualize processes, architectures, or flows described in the document — this makes slides more engaging.`;
  }

  private parseSlides(response: string): SlidesJson {
    const fallback: SlidesJson = {
      meta: { title: '슬라이드 생성 실패', subtitle: '' },
      slides: [],
    };

    try {
      const jsonMatch =
        response.match(/\{[\s\S]*\}/) ||
        response.match(/```json\s*([\s\S]*?)```/i);
      if (!jsonMatch) return fallback;

      const text = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(text.trim());

      if (!parsed.meta || !Array.isArray(parsed.slides)) {
        return fallback;
      }

      return {
        meta: {
          title: typeof parsed.meta.title === 'string' ? parsed.meta.title : '',
          subtitle: typeof parsed.meta.subtitle === 'string' ? parsed.meta.subtitle : '',
        },
        slides: parsed.slides,
      };
    } catch {
      return fallback;
    }
  }

  private fallbackSlides(content: string): SlidesJson {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '문서';

    return {
      meta: { title, subtitle: '슬라이드 자동 생성에 실패했습니다.' },
      slides: [
        { type: 'title', title, subtitle: '슬라이드 자동 생성에 실패했습니다.' },
      ],
    };
  }
}
