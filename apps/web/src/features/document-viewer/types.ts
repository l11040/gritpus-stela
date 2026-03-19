export interface MdDocument {
  id: string;
  title: string;
  currentContent: string | null;
  currentVersion: number;
  isShared: number;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  summaryJson: MdDocumentSummary | null;
  slidesJson: SlidesJson | null;
  createdAt: string;
  updatedAt: string;
}

export interface MdDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  changeNote: string | null;
  createdBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface MdDocumentSummary {
  slideCount: number;
  estimatedDuration: string;
  keyMessages: string[];
  audienceNotes: string;
  suggestedFlow: { section: string; description: string; slides: number }[];
  tableOfContents: { title: string; level: number }[];
  estimatedReadTime: number;
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface SlideContent {
  title: string;
  content: string;
  isTitle?: boolean;
}

// AI 슬라이드 JSON 타입 (gen-ppt-v2 스키마)
export interface SlidesJson {
  meta: { title: string; subtitle: string };
  slides: AiSlideItem[];
}

export type AiSlideItem =
  | { type: 'title'; title: string; subtitle: string }
  | { type: 'toc'; cards: { num: string; title: string; desc: string; slide: number }[] }
  | { type: 'section'; num: string; title: string; subtitle: string }
  | { type: 'content'; title: string; subtitle?: string; elements: AiSlideElement[] };

export type AiSlideElement =
  | ['p', string]
  | ['h3', string]
  | ['code', string]
  | ['highlight-box', string]
  | ['warning-box', string]
  | ['list', { items: string[]; ordered?: boolean }]
  | ['ul', string[]]
  | ['ol', string[]]
  | ['table', { headers: string[]; rows: string[][]; compact?: boolean }]
  | ['flow', { steps: string[]; highlight?: number }]
  | ['card-grid', { cols: number; cards: { title: string; body: string }[] }]
  | ['cols', { columns: AiSlideElement[][] }]
  | ['badges', { text: string; color: string }[]]
  | ['status-flow', (string | { text: string; color: string })[]]
  | ['mermaid', string]
  | ['html', string];
