import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { marked } from 'marked';
import hljs from 'highlight.js';

interface SlideItem {
  type: 'title' | 'toc' | 'section' | 'content';
  title?: string;
  subtitle?: string;
  num?: string;
  cards?: { num: string; title: string; desc: string }[];
  elements?: [string, unknown][];
}

interface SlidesJson {
  meta: { title: string; subtitle: string };
  slides: SlideItem[];
}

@Injectable()
export class MdDocumentPdfService {
  private readonly logger = new Logger(MdDocumentPdfService.name);

  /** 마크다운 → A4 세로 PDF */
  async generatePdf(markdownContent: string, title: string): Promise<Buffer> {
    const html = await this.markdownToHtml(markdownContent, title);
    return this.renderPdf(html, { format: 'A4', landscape: false });
  }

  /** 마크다운 → h2 기반 슬라이드 → 가로 PDF */
  async generatePresentationPdf(
    markdownContent: string,
    title: string,
  ): Promise<Buffer> {
    const slides = this.splitMarkdownIntoSlides(markdownContent);
    const html = await this.buildPresentationHtml(slides, title);
    return this.renderPdf(html, { format: 'A4', landscape: true });
  }

  /** AI JSON 슬라이드 → 가로 PDF */
  async generateSlidesPdf(slidesJson: SlidesJson): Promise<Buffer> {
    const html = this.buildAiSlidesHtml(slidesJson);
    return this.renderPdf(html, { format: 'A4', landscape: true });
  }

  // ──── Private: Puppeteer 렌더링 ────

  private async renderPdf(
    html: string,
    options: { format: 'A4'; landscape: boolean },
  ): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: options.format,
        landscape: options.landscape,
        printBackground: true,
        margin: options.landscape
          ? { top: '0', right: '0', bottom: '0', left: '0' }
          : { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      });

      return Buffer.from(pdfBuffer);
    } catch (err) {
      this.logger.error('PDF generation failed', err);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // ──── Private: 마크다운 HTML ────

  private async markdownToHtml(
    markdownContent: string,
    title: string,
  ): Promise<string> {
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(text, { language: lang }).value;
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
      }
      return `<pre><code>${text}</code></pre>`;
    };
    marked.setOptions({ renderer, gfm: true, breaks: false });
    const htmlBody = await marked.parse(markdownContent);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.esc(title)}</title>
<style>${MD_STYLES}</style></head><body>${htmlBody}</body></html>`;
  }

  // ──── Private: 마크다운 PPT ────

  private splitMarkdownIntoSlides(
    content: string,
  ): { title: string; body: string }[] {
    const lines = content.split('\n');
    const slides: { title: string; body: string }[] = [];
    let currentTitle = '';
    let currentBody: string[] = [];

    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        if (currentTitle || currentBody.length > 0) {
          slides.push({
            title: currentTitle,
            body: currentBody.join('\n'),
          });
        }
        currentTitle = h2Match[1].trim();
        currentBody = [];
      } else {
        currentBody.push(line);
      }
    }
    if (currentTitle || currentBody.length > 0) {
      slides.push({ title: currentTitle, body: currentBody.join('\n') });
    }
    return slides;
  }

  private async buildPresentationHtml(
    slides: { title: string; body: string }[],
    title: string,
  ): Promise<string> {
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(text, { language: lang }).value;
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
      }
      return `<pre><code>${text}</code></pre>`;
    };
    marked.setOptions({ renderer, gfm: true, breaks: false });

    const slideHtmls: string[] = [];

    // 타이틀 슬라이드
    slideHtmls.push(`
      <div class="slide slide-title">
        <h1>${this.esc(title)}</h1>
      </div>
    `);

    for (const slide of slides) {
      const bodyHtml = await marked.parse(slide.body);
      slideHtmls.push(`
        <div class="slide slide-content">
          <h2>${this.esc(slide.title)}</h2>
          <div class="slide-body">${bodyHtml}</div>
        </div>
      `);
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.esc(title)}</title>
<style>${SLIDE_BASE_STYLES}${MD_SLIDE_STYLES}</style></head><body>${slideHtmls.join('')}</body></html>`;
  }

  // ──── Private: AI 슬라이드 HTML ────

  private buildAiSlidesHtml(slidesJson: SlidesJson): string {
    const slideHtmls = slidesJson.slides.map((slide) =>
      this.renderAiSlide(slide),
    );
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${this.esc(slidesJson.meta.title)}</title>
<style>${SLIDE_BASE_STYLES}${AI_SLIDE_STYLES}</style></head><body>${slideHtmls.join('')}</body></html>`;
  }

  private renderAiSlide(slide: SlideItem): string {
    switch (slide.type) {
      case 'title':
        return `<div class="slide ai-title">
          <h1>${this.esc(slide.title || '')}</h1>
          ${slide.subtitle ? `<p class="subtitle">${this.esc(slide.subtitle)}</p>` : ''}
        </div>`;

      case 'toc':
        return `<div class="slide ai-toc">
          <p class="label">AGENDA</p>
          <h2>목차</h2>
          <div class="toc-grid">${(slide.cards || []).map((c) => `
            <div class="toc-card">
              <span class="toc-num">${this.esc(c.num)}</span>
              <div><div class="toc-title">${this.esc(c.title)}</div>
              ${c.desc ? `<div class="toc-desc">${this.esc(c.desc)}</div>` : ''}</div>
            </div>`).join('')}
          </div>
        </div>`;

      case 'section':
        return `<div class="slide ai-section">
          <div class="section-num">${this.esc(slide.num || '')}</div>
          <h2>${this.esc(slide.title || '')}</h2>
          ${slide.subtitle ? `<p class="subtitle">${this.esc(slide.subtitle)}</p>` : ''}
        </div>`;

      case 'content':
        return `<div class="slide ai-content">
          <h2>${this.esc(slide.title || '')}</h2>
          ${slide.subtitle ? `<p class="content-subtitle">${this.esc(slide.subtitle)}</p>` : ''}
          <div class="elements">${(slide.elements || []).map((el) => this.renderElement(el)).join('')}</div>
        </div>`;

      default:
        return '';
    }
  }

  private renderElement(element: [string, unknown]): string {
    const [kind, data] = element;
    switch (kind) {
      case 'p':
        return `<p>${this.esc(data as string)}</p>`;
      case 'h3':
        return `<h3>${this.esc(data as string)}</h3>`;
      case 'code':
        return `<pre><code>${this.esc(data as string)}</code></pre>`;
      case 'highlight-box':
        return `<div class="highlight-box">${this.esc(data as string)}</div>`;
      case 'warning-box':
        return `<div class="warning-box">${this.esc(data as string)}</div>`;
      case 'ul':
      case 'ol': {
        const items = data as string[];
        const tag = kind === 'ol' ? 'ol' : 'ul';
        return `<${tag}>${items.map((i) => `<li>${this.esc(i)}</li>`).join('')}</${tag}>`;
      }
      case 'list': {
        const d = data as { items: string[]; ordered?: boolean };
        const tag = d.ordered ? 'ol' : 'ul';
        return `<${tag}>${d.items.map((i) => `<li>${this.esc(i)}</li>`).join('')}</${tag}>`;
      }
      case 'table': {
        const t = data as { headers: string[]; rows: string[][] };
        return `<table>
          <thead><tr>${t.headers.map((h) => `<th>${this.esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${this.esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;
      }
      case 'card-grid': {
        const g = data as { cols: number; cards: { title: string; body: string }[] };
        return `<div class="card-grid cols-${g.cols}">${g.cards.map((c) =>
          `<div class="card"><h4>${this.esc(c.title)}</h4><p>${this.esc(c.body)}</p></div>`,
        ).join('')}</div>`;
      }
      case 'flow': {
        const f = data as { steps: string[] };
        return `<div class="flow">${f.steps.map((s) =>
          s === '→'
            ? '<span class="flow-arrow">→</span>'
            : `<span class="flow-step">${this.esc(s)}</span>`,
        ).join('')}</div>`;
      }
      case 'badges': {
        const badges = data as { text: string; color: string }[];
        return `<div class="badges">${badges.map((b) =>
          `<span class="badge badge-${b.color}">${this.esc(b.text)}</span>`,
        ).join('')}</div>`;
      }
      default:
        return '';
    }
  }

  private esc(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// ──── 스타일 상수 ────

const MD_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.8; font-size: 14px; }
  h1 { font-size: 1.8rem; font-weight: 700; margin: 1.5rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 2px solid #e5e7eb; }
  h2 { font-size: 1.4rem; font-weight: 700; margin: 1.25rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb; }
  h3 { font-size: 1.15rem; font-weight: 600; margin: 1rem 0 0.4rem; color: #2563eb; }
  p { margin-bottom: 0.6rem; } ul, ol { padding-left: 1.5rem; margin: 0.4rem 0; } li { margin-bottom: 0.2rem; }
  blockquote { background: #f9fafb; border-left: 4px solid #2563eb; padding: 0.6rem 1rem; border-radius: 0 6px 6px 0; margin: 0.75rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.85rem; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  th { background: #2563eb; color: #fff; font-weight: 600; padding: 0.6rem 0.8rem; text-align: left; }
  td { padding: 0.5rem 0.8rem; border-bottom: 1px solid #e5e7eb; } tr:nth-child(even) td { background: #f9fafb; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0.75rem 0; }
  pre code { background: none; padding: 0; color: inherit; font-size: 0.8rem; line-height: 1.5; }
  img { max-width: 100%; border-radius: 6px; } a { color: #2563eb; text-decoration: none; }
  hr { border: none; height: 1px; background: #e5e7eb; margin: 1.5rem 0; }
  .hljs-keyword { color: #569cd6; } .hljs-string { color: #ce9178; } .hljs-number { color: #b5cea8; }
  .hljs-comment { color: #6a9955; } .hljs-function { color: #dcdcaa; }
  @page { margin: 20mm 15mm; }
`;

const SLIDE_BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .slide { width: 297mm; height: 210mm; padding: 48px 64px; page-break-after: always; overflow: hidden; position: relative; }
  @page { size: A4 landscape; margin: 0; }
`;

const MD_SLIDE_STYLES = `
  .slide-title { display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1e3a5f, #2563eb, #3b82f6); color: white; text-align: center; }
  .slide-title h1 { font-size: 2.8rem; font-weight: 700; }
  .slide-content { background: white; display: flex; flex-direction: column; }
  .slide-content h2 { font-size: 1.6rem; font-weight: 700; color: #1e3a5f; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #2563eb; }
  .slide-body { flex: 1; font-size: 0.95rem; line-height: 1.7; color: #334155; overflow: hidden; }
  .slide-body h3 { font-size: 1.1rem; font-weight: 600; color: #2563eb; margin: 12px 0 6px; }
  .slide-body p { margin-bottom: 8px; } .slide-body ul, .slide-body ol { padding-left: 1.5rem; margin: 6px 0; }
  .slide-body li { margin-bottom: 3px; }
  .slide-body pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 0.8rem; margin: 8px 0; overflow: hidden; }
  .slide-body code { font-family: monospace; font-size: 0.85em; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  .slide-body pre code { background: none; padding: 0; color: inherit; }
  .slide-body table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 8px 0; }
  .slide-body th { background: #2563eb; color: white; padding: 6px 10px; text-align: left; }
  .slide-body td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
  .slide-body blockquote { border-left: 3px solid #2563eb; background: #eff6ff; padding: 8px 12px; border-radius: 0 6px 6px 0; margin: 8px 0; }
`;

const AI_SLIDE_STYLES = `
  .ai-title { display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1e3a5f, #1d4ed8, #3b82f6); color: white; text-align: center; }
  .ai-title h1 { font-size: 2.8rem; font-weight: 700; margin-bottom: 12px; }
  .ai-title .subtitle { font-size: 1.2rem; opacity: 0.8; }

  .ai-toc { background: white; }
  .ai-toc .label { font-size: 0.7rem; font-weight: 600; letter-spacing: 2px; color: #2563eb; margin-bottom: 4px; }
  .ai-toc h2 { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; }
  .ai-toc .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ai-toc .toc-card { display: flex; gap: 12px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
  .ai-toc .toc-num { display: flex; width: 32px; height: 32px; align-items: center; justify-content: center;
    background: #2563eb; color: white; border-radius: 8px; font-size: 0.85rem; font-weight: 700; flex-shrink: 0; }
  .ai-toc .toc-title { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
  .ai-toc .toc-desc { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }

  .ai-section { display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0f172a, #334155); color: white; text-align: center; }
  .ai-section .section-num { font-size: 4rem; font-weight: 700; opacity: 0.15; margin-bottom: -20px; }
  .ai-section h2 { font-size: 2.2rem; font-weight: 700; }
  .ai-section .subtitle { font-size: 1rem; opacity: 0.5; margin-top: 12px; }

  .ai-content { background: white; }
  .ai-content h2 { font-size: 1.6rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .ai-content .content-subtitle { font-size: 1rem; color: #64748b; margin-bottom: 20px; }
  .ai-content .elements { font-size: 0.9rem; color: #334155; line-height: 1.7; }
  .ai-content h3 { font-size: 1.05rem; font-weight: 600; color: #1d4ed8; margin: 14px 0 6px; }
  .ai-content p { margin-bottom: 8px; }
  .ai-content ul, .ai-content ol { padding-left: 1.5rem; margin: 6px 0; }
  .ai-content li { margin-bottom: 3px; }
  .ai-content pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 0.8rem; overflow: hidden; margin: 8px 0; }
  .ai-content code { font-family: monospace; font-size: 0.85em; }
  .ai-content table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 8px 0; }
  .ai-content th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .ai-content td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  .ai-content tr:nth-child(even) td { background: #f8fafc; }
  .highlight-box { border-left: 4px solid #2563eb; background: #eff6ff; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; font-size: 0.85rem; }
  .warning-box { border-left: 4px solid #f59e0b; background: #fffbeb; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; font-size: 0.85rem; }
  .card-grid { display: grid; gap: 12px; margin: 10px 0; }
  .card-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .card-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: white; }
  .card h4 { font-size: 0.85rem; font-weight: 600; color: #2563eb; margin-bottom: 6px; }
  .card p { font-size: 0.8rem; color: #64748b; margin: 0; }
  .flow { display: flex; align-items: center; gap: 0; flex-wrap: wrap; margin: 10px 0; }
  .flow-step { background: #eff6ff; color: #1e3a5f; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; }
  .flow-arrow { color: #94a3b8; margin: 0 8px; font-size: 1.1rem; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
  .badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f1f5f9; color: #475569; }
`;
