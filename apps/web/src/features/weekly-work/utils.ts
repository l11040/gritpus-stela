export const RECURRING_MEETING_STORAGE_KEY = 'weekly-recurring-meetings';
export const INCLUDE_RECURRING_STORAGE_KEY = 'weekly-include-recurring-meetings';

export function getCurrentWeekStartDate(): string {
  return formatDateToYmd(normalizeToWeekStart(new Date()));
}

export function normalizeToWeekStartDate(value: string): string {
  const parsed = parseYmdDate(value);
  if (!parsed) return getCurrentWeekStartDate();
  return formatDateToYmd(normalizeToWeekStart(parsed));
}

export function shiftWeekStartDate(weekStartDate: string, offsetWeek: number): string {
  const parsed = parseYmdDate(weekStartDate);
  const base = parsed ? normalizeToWeekStart(parsed) : normalizeToWeekStart(new Date());
  base.setDate(base.getDate() + offsetWeek * 7);
  return formatDateToYmd(base);
}

export function formatWeekRangeLabel(weekStartDate: string): string {
  const start = parseYmdDate(weekStartDate);
  if (!start) return '';
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('ko-KR')} ~ ${end.toLocaleDateString('ko-KR')}`;
}

export function parseYmdDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function composeSourceText(
  sourceText: string,
  recurringMeetings: string,
  includeRecurringMeetings: boolean,
  weekStartDate?: string,
): string {
  if (!includeRecurringMeetings) return sourceText;
  const recurring = recurringMeetings.trim();
  if (!recurring) return sourceText;
  if (sourceText.includes('[반복 미팅]')) return sourceText;
  const materialized = weekStartDate
    ? materializeRecurringMeetingsForWeek(recurring, weekStartDate)
    : recurring;
  return `${sourceText}\n\n[반복 미팅]\n${materialized}`;
}

export function toSlackPasteText(markdown: string): string {
  const tokens = tokenizeMarkdownForSlack(markdown);
  const converted = tokens.map((token) => {
    if (token.type === 'blank') return '';
    if (token.type === 'text') return inlineToSlackPasteText(token.text);

    const indent = '\u00A0'.repeat(token.depth * 4);
    return `${indent}•\u00A0 ${inlineToSlackPasteText(token.text)}`;
  });

  return converted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function toSlackHtml(markdown: string): string {
  const tokens = tokenizeMarkdownForSlack(markdown);
  const html = tokens
    .map((token) => {
      if (token.type === 'blank') {
        return '<div><br/></div>';
      }

      if (token.type === 'text') {
        return `<div>${inlineToHtml(token.text)}</div>`;
      }

      const indent = '&nbsp;'.repeat(token.depth * 4);
      return `<div>${indent}&bull;&nbsp;&nbsp;${inlineToHtml(token.text)}</div>`;
    })
    .join('');

  return `<div>${html}</div>`;
}

type SlackToken =
  | { type: 'bullet'; depth: number; text: string }
  | { type: 'text'; text: string }
  | { type: 'blank' };

function tokenizeMarkdownForSlack(markdown: string): SlackToken[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const hasExplicitIndent = lines.some((rawLine) => {
    const line = rawLine.replace(/\t/g, '    ');
    return /^ {2,}(?:[-*+]|\d+\.)\s+/.test(line);
  });

  const tokens: SlackToken[] = [];
  let inCategory = false;
  let inMeeting = false;

  for (const rawLine of lines) {
    const normalizedTabs = rawLine.replace(/\t/g, '    ');
    const trimmed = normalizedTabs.trim();

    if (!trimmed) {
      tokens.push({ type: 'blank' });
      continue;
    }

    const listMatch = normalizedTabs.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/);
    if (!listMatch) {
      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      tokens.push({ type: 'text', text: headingMatch ? `**${headingMatch[1].trim()}**` : trimmed });
      continue;
    }

    const leadingSpaces = listMatch[1].length;
    const text = listMatch[2].trim();

    if (hasExplicitIndent) {
      const plain = stripBoldMarkers(text);
      if (isCategoryHeading(text)) {
        inCategory = true;
        inMeeting = false;
      } else if (plain === '미팅') {
        inMeeting = true;
      } else if (leadingSpaces === 0) {
        inCategory = false;
        inMeeting = false;
      }

      tokens.push({
        type: 'bullet',
        depth: resolveListDepth(leadingSpaces),
        text,
      });
      continue;
    }

    const inferred = inferDepthWithoutIndent(text, inCategory, inMeeting);
    inCategory = inferred.inCategory;
    inMeeting = inferred.inMeeting;
    tokens.push({
      type: 'bullet',
      depth: inferred.depth,
      text,
    });
  }

  return tokens;
}

function inferDepthWithoutIndent(
  text: string,
  inCategory: boolean,
  inMeeting: boolean,
): { depth: number; inCategory: boolean; inMeeting: boolean } {
  const plain = stripBoldMarkers(text);

  if (isCategoryHeading(text)) {
    return { depth: 0, inCategory: true, inMeeting: false };
  }

  if (plain === '미팅') {
    return { depth: 1, inCategory: true, inMeeting: true };
  }

  if (/^\[[^\]]+\]\s*:/.test(plain)) {
    return { depth: inMeeting ? 2 : 1, inCategory: true, inMeeting };
  }

  if (inCategory) {
    return { depth: 1, inCategory: true, inMeeting: false };
  }

  return { depth: 0, inCategory: false, inMeeting: false };
}

function isCategoryHeading(text: string): boolean {
  const plain = stripBoldMarkers(text);
  return /^\*\*.+\*\*$/.test(text) && plain !== '미팅';
}

function stripBoldMarkers(text: string): string {
  return text.replace(/^\*\*(.+)\*\*$/, '$1').trim();
}

function inlineToSlackPasteText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s),.:;!?])/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s),.:;!?])/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1');
}

function resolveListDepth(leadingSpaces: number): number {
  if (leadingSpaces >= 4) {
    return Math.floor(leadingSpaces / 4);
  }
  return Math.max(0, Math.floor(leadingSpaces / 2));
}

function inlineToHtml(text: string): string {
  const links: string[] = [];
  const withLinkToken = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, label: string, url: string) => {
      const token = `__LINK_${links.length}__`;
      links.push(`<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`);
      return token;
    },
  );

  let escaped = escapeHtml(withLinkToken)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  escaped = escaped.replace(/__LINK_(\d+)__/g, (_match, index: string) => {
    const tokenIndex = Number(index);
    return links[tokenIndex] || '';
  });

  return escaped;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function materializeRecurringMeetingsForWeek(recurring: string, weekStartDate: string): string {
  const lines = recurring
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const match = line.match(/^\[([^\]]+)\]\s*:\s*(.+)$/);
      if (!match) return line;

      const whenText = match[1].trim();
      const topic = match[2].trim();
      return `[${materializeRecurringWhenText(whenText, weekStartDate)}] : ${topic}`;
    })
    .join('\n');
}

function materializeRecurringWhenText(whenText: string, weekStartDate: string): string {
  const matched = whenText.match(/매주\s*(월|화|수|목|금|토|일)(?:요일)?(?:\s+(.+))?/);
  if (!matched) {
    return whenText;
  }

  const dayToken = matched[1];
  const timeText = (matched[2] || '').trim().replace(/\s+/g, '');
  const resolvedDate = resolveDateByWeekday(weekStartDate, dayToken);
  if (!resolvedDate) {
    return whenText;
  }

  return timeText ? `${resolvedDate}(${dayToken}) ${timeText}` : `${resolvedDate}(${dayToken})`;
}

function resolveDateByWeekday(weekStartDate: string, dayToken: string): string | null {
  const offsets: Record<string, number> = {
    월: 0,
    화: 1,
    수: 2,
    목: 3,
    금: 4,
    토: 5,
    일: 6,
  };
  const offset = offsets[dayToken];
  if (offset === undefined) return null;

  const [year, month, day] = weekStartDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + offset);
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

function normalizeToWeekStart(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}
