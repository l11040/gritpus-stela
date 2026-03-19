import type { TocHeading, SlideContent } from '../types';

export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-');
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export function splitIntoSlides(markdown: string): SlideContent[] {
  const lines = markdown.split('\n');
  const slides: SlideContent[] = [];
  let currentSlide: string[] = [];
  let currentTitle = '';
  let isFirst = true;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentSlide.length > 0 || currentTitle) {
        slides.push({
          title: currentTitle,
          content: currentSlide.join('\n').trim(),
          isTitle: isFirst && slides.length === 0,
        });
      }
      currentTitle = h2Match[1].trim();
      currentSlide = [];
      isFirst = false;
    } else {
      currentSlide.push(line);
    }
  }

  if (currentSlide.length > 0 || currentTitle) {
    slides.push({
      title: currentTitle,
      content: currentSlide.join('\n').trim(),
      isTitle: isFirst && slides.length === 0,
    });
  }

  if (slides.length === 0) {
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    slides.push({
      title: h1Match ? h1Match[1] : 'Untitled',
      content: markdown,
      isTitle: true,
    });
  }

  return slides;
}
