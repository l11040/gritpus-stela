type ActionItemWithDueDate = {
  title: string;
  description?: string;
  dueDate?: string;
};

const KOREAN_WEEKDAY: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const ENGLISH_WEEKDAY: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function toStartOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseReferenceDate(referenceDate?: string | Date): Date {
  if (!referenceDate) return toStartOfDay(new Date());
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) return toStartOfDay(new Date());
  return toStartOfDay(date);
}

function addDays(date: Date, days: number): Date {
  const next = toStartOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function isValidYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toYmd(date) === value;
}

function toValidatedYmd(year: number, month: number, day: number): string | undefined {
  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidYmd(normalized) ? normalized : undefined;
}

function normalizeAbsoluteDate(candidate: string, baseDate: Date): string | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  if (isValidYmd(trimmed)) return trimmed;

  const ymd = trimmed.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (ymd) {
    return toValidatedYmd(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
  }

  const ymdKorean = trimmed.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  if (ymdKorean) {
    return toValidatedYmd(
      Number(ymdKorean[1]),
      Number(ymdKorean[2]),
      Number(ymdKorean[3]),
    );
  }

  const mdNumeric = trimmed.match(/(?:^|[^\d])(\d{1,2})[./-](\d{1,2})(?:$|[^\d])/);
  const mdKorean = trimmed.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  if (mdNumeric || mdKorean) {
    const month = Number((mdNumeric || mdKorean)![1]);
    const day = Number((mdNumeric || mdKorean)![2]);
    const currentYear = baseDate.getFullYear();
    const thisYear = toValidatedYmd(currentYear, month, day);
    if (!thisYear) return undefined;

    const thisYearDate = new Date(`${thisYear}T00:00:00`);
    // 회의 시점보다 30일 이상 과거면 내년 날짜로 간주
    if (thisYearDate.getTime() < addDays(baseDate, -30).getTime()) {
      const nextYear = toValidatedYmd(currentYear + 1, month, day);
      return nextYear || thisYear;
    }
    return thisYear;
  }

  return undefined;
}

function normalizeRelativeDate(candidate: string, baseDate: Date): string | undefined {
  const text = candidate.replace(/\s+/g, '');
  const englishText = candidate.toLowerCase();

  if (/(오늘|today)/i.test(text)) return toYmd(baseDate);
  if (/(모레|dayaftertomorrow)/i.test(text)) return toYmd(addDays(baseDate, 2));
  if (/(내일|tomorrow)/i.test(text)) return toYmd(addDays(baseDate, 1));

  const resolveWeekdayDate = (
    targetDay: number,
    offsetWeeks: number,
    hasExplicitWeekToken: boolean,
  ): string => {
    const weekStart = startOfWeekMonday(baseDate);
    const mondayBasedTarget = targetDay === 0 ? 6 : targetDay - 1;
    let target = addDays(weekStart, offsetWeeks * 7 + mondayBasedTarget);
    if (!hasExplicitWeekToken && target.getTime() < baseDate.getTime()) {
      target = addDays(target, 7);
    }
    return toYmd(target);
  };

  const koreanWeekMatch = text.match(
    /(이번주|금주|다음주|차주|다다음주)?([월화수목금토일])(?:요일|(?=까지|전|내|마감))/,
  );
  if (koreanWeekMatch) {
    const weekToken = koreanWeekMatch[1] || '';
    const targetDay = KOREAN_WEEKDAY[koreanWeekMatch[2]];
    let offsetWeeks = 0;
    if (/(다다음주)/.test(weekToken)) offsetWeeks = 2;
    else if (/(다음주|차주)/.test(weekToken)) offsetWeeks = 1;

    return resolveWeekdayDate(targetDay, offsetWeeks, !!weekToken);
  }

  const englishNextWeekdayMatch = englishText.match(
    /\bnext\s*week\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i,
  );
  if (englishNextWeekdayMatch) {
    const targetDay = ENGLISH_WEEKDAY[englishNextWeekdayMatch[1].toLowerCase()];
    return resolveWeekdayDate(targetDay, 1, true);
  }

  const englishWeekMatch = englishText.match(
    /\b(this|next)?\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\b/i,
  );
  if (englishWeekMatch) {
    const weekToken = englishWeekMatch[1]?.toLowerCase();
    const dayToken = englishWeekMatch[2].toLowerCase();
    const targetDay = ENGLISH_WEEKDAY[dayToken];
    const offsetWeeks = weekToken === 'next' ? 1 : 0;
    return resolveWeekdayDate(targetDay, offsetWeeks, !!weekToken);
  }

  if (/(주말|weekend)/i.test(candidate)) {
    return resolveWeekdayDate(6, 0, false);
  }

  if (/(다다음주)/.test(text)) return toYmd(addDays(baseDate, 14));
  if (/(다음주|차주|nextweek)/i.test(text)) return toYmd(addDays(baseDate, 7));
  if (/(이번주|금주|thisweek)/i.test(text)) return toYmd(addDays(baseDate, 3));
  return undefined;
}

function extractDateCandidates(item: ActionItemWithDueDate): string[] {
  const candidates = new Set<string>();
  if (item.dueDate) candidates.add(item.dueDate);

  const source = `${item.title || ''}\n${item.description || ''}\n${item.dueDate || ''}`;
  const patterns = [
    /\d{4}[./-]\d{1,2}[./-]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?/g,
    /\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일?/g,
    /(?:^|[^\d])\d{1,2}[./-]\d{1,2}(?:$|[^\d])/g,
    /\d{1,2}\s*월\s*\d{1,2}\s*일?/g,
    /(?:이번\s*주|금주|다음\s*주|차주|다다음\s*주)?\s*[월화수목금토일]\s*요일(?:까지|전|내)?/g,
    /(?:이번\s*주|금주|다음\s*주|차주|다다음\s*주)?\s*[월화수목금토일](?:까지|전|내|마감)/g,
    /(오늘|내일|모레|이번\s*주|금주|다음\s*주|차주|다다음\s*주)\s*[월화수목금토일]?\s*요일?/g,
    /\b(next\s*week\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))\b/gi,
    /\b(today|tomorrow|next\s*week)\b/gi,
    /\b(day\s*after\s*tomorrow|this\s*week|weekend)\b/gi,
    /\b(next\s*(mon|tue|wed|thu|fri|sat|sun)(day)?)\b/gi,
    /\b((this|next)?\s*(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun))\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = source.match(pattern);
    if (!matches) continue;
    for (const value of matches) {
      candidates.add(value);
    }
  }

  return [...candidates];
}

function normalizeDueDate(candidate: string, baseDate: Date): string | undefined {
  return (
    normalizeAbsoluteDate(candidate, baseDate) ||
    normalizeRelativeDate(candidate, baseDate)
  );
}

export function normalizeActionItemsDueDates<T extends ActionItemWithDueDate>(
  items: T[],
  referenceDate?: string | Date,
): T[] {
  const baseDate = parseReferenceDate(referenceDate);

  return items.map((item) => {
    const candidates = extractDateCandidates(item);
    const normalized = candidates
      .map((candidate) => normalizeDueDate(candidate, baseDate))
      .find((value): value is string => !!value);

    return {
      ...item,
      dueDate: normalized,
    };
  });
}
