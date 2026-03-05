function parseCardDate(date: string): Date {
  // Preserve date-only strings (`YYYY-MM-DD`) as local dates to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(date);
}

export function formatCardDate(date?: string | null): string | null {
  if (!date) return null;

  const parsed = parseCardDate(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}
