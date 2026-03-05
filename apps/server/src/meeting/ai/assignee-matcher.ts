type ActionItemAssigneeFields = {
  title?: string;
  description?: string;
  assigneeName?: string;
  assigneeId?: string;
  assigneeNames?: string[];
  assigneeIds?: string[];
};

type ProjectMemberProfile = {
  userId: string;
  name: string;
  email: string;
};

const ASSIGNEE_SPLIT_REGEX =
  /\s*(?:,|\/|\\|&|\+|·|ㆍ|、|;|\band\b|\bwith\b|및|그리고|와|과)\s*/giu;
const GENERIC_ASSIGNEE_TOKENS = new Set([
  '',
  'none',
  'n/a',
  'na',
  'all',
  'everyone',
  'team',
  '미배정',
  '미정',
  '담당자없음',
]);
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidV4(value: string): boolean {
  return UUID_V4_REGEX.test(value);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function normalizeAssigneeText(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^담당\s*[:：]?\s*/u, '')
    .replace(/[()]/g, '')
    .replace(
      /(님|씨|매니저|팀장|리드|대표|담당자|manager|lead|owner|pm|pl)$/u,
      '',
    )
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}@._-]/gu, '');
}

function splitAssigneeNames(rawName: string): string[] {
  return rawName
    .split(ASSIGNEE_SPLIT_REGEX)
    .flatMap((name) => name.split(/[:：]/))
    .map((name) => name.trim())
    .filter(Boolean);
}

function scoreMemberMatch(rawCandidate: string, member: ProjectMemberProfile): number {
  const candidate = normalizeAssigneeText(rawCandidate);
  if (!candidate || GENERIC_ASSIGNEE_TOKENS.has(candidate)) return 0;

  const normalizedName = normalizeAssigneeText(member.name || '');
  const normalizedEmail = normalizeAssigneeText(member.email || '');
  const normalizedEmailLocal = normalizedEmail.split('@')[0] || '';
  const pools = [normalizedName, normalizedEmail, normalizedEmailLocal].filter(Boolean);
  if (pools.length === 0) return 0;

  if (pools.some((value) => value === candidate)) {
    return candidate.includes('@') ? 1 : 0.98;
  }

  if (
    candidate.length >= 2 &&
    pools.some((value) => value.includes(candidate) || candidate.includes(value))
  ) {
    return 0.9;
  }

  const fuzzyScore = Math.max(...pools.map((value) => similarity(candidate, value)));
  return fuzzyScore;
}

function findBestMember(
  rawCandidate: string,
  members: ProjectMemberProfile[],
): ProjectMemberProfile | null {
  if (members.length === 0) return null;

  const normalizedCandidate = normalizeAssigneeText(rawCandidate);
  if (
    !normalizedCandidate ||
    GENERIC_ASSIGNEE_TOKENS.has(normalizedCandidate)
  ) {
    return null;
  }

  const ranked = members
    .map((member) => ({
      member,
      score: scoreMemberMatch(rawCandidate, member),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return null;

  const hasKorean = /[가-힣]/.test(normalizedCandidate);
  let threshold = 0.72;
  if (normalizedCandidate.length <= 1) {
    threshold = 0.97;
  } else if (normalizedCandidate.length === 2) {
    threshold = hasKorean ? 0.88 : 0.9;
  } else if (normalizedCandidate.length === 3) {
    threshold = hasKorean ? 0.86 : 0.84;
  }
  if (best.score < threshold) return null;

  const second = ranked[1];
  if (second && best.score - second.score < 0.05 && best.score < 0.95) {
    return null;
  }

  return best.member;
}

function collectAssigneeCandidates(
  item: ActionItemAssigneeFields,
  members: ProjectMemberProfile[],
): string[] {
  const memberById = new Map(members.map((member) => [member.userId, member]));
  const merged = [
    ...(item.assigneeNames ?? []),
    ...(item.assigneeName ? splitAssigneeNames(item.assigneeName) : []),
  ];

  // 모델이 assigneeIds에 UUID 대신 이름/이메일을 넣는 경우를 보정
  const rawAssigneeIdCandidates = [
    ...(item.assigneeIds ?? []),
    ...(item.assigneeId ? [item.assigneeId] : []),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value)
    .filter((value) => !memberById.has(value) && !isUuidV4(value))
    .flatMap((value) => splitAssigneeNames(value));
  merged.push(...rawAssigneeIdCandidates);

  const source = `${item.title || ''}\n${item.description || ''}`;
  const ownerPattern = /(?:담당(?:자)?|owner|assignee)\s*[:：-]?\s*([^\n]+)/giu;
  const ownerMatches = source.matchAll(ownerPattern);
  for (const match of ownerMatches) {
    const ownerText = match[1]?.trim();
    if (!ownerText) continue;
    merged.push(...splitAssigneeNames(ownerText));
  }

  // assignee 필드가 비어 있으면 본문에서 멤버 이름/이메일 local-part 직접 언급도 후보로 추가
  if (merged.length === 0 && source.trim()) {
    const sourceLower = source.toLowerCase();
    for (const member of members) {
      if (member.name && source.includes(member.name)) {
        merged.push(member.name);
      }
      const emailLocal = member.email?.split('@')[0]?.trim();
      if (emailLocal && emailLocal.length >= 3 && sourceLower.includes(emailLocal.toLowerCase())) {
        merged.push(emailLocal);
      }
    }
  }

  const normalizedMerged = merged.map((name) => name.trim());

  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of normalizedMerged) {
    const key = normalizeAssigneeText(name);
    if (!key || seen.has(key) || GENERIC_ASSIGNEE_TOKENS.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function mapActionItemsWithFuzzyAssignees<T extends ActionItemAssigneeFields>(
  items: T[],
  members: ProjectMemberProfile[],
): T[] {
  const memberById = new Map(members.map((member) => [member.userId, member]));

  return items.map((item) => {
    const resolvedIds = new Set<string>();
    for (const id of item.assigneeIds ?? []) {
      if (id && memberById.has(id)) resolvedIds.add(id);
    }
    if (item.assigneeId && memberById.has(item.assigneeId)) {
      resolvedIds.add(item.assigneeId);
    }

    const nameCandidates = collectAssigneeCandidates(item, members);
    for (const candidate of nameCandidates) {
      const matched = findBestMember(candidate, members);
      if (matched) resolvedIds.add(matched.userId);
    }

    const assigneeIds = [...resolvedIds];
    const assigneeNamesFromIds = assigneeIds
      .map((id) => memberById.get(id)?.name)
      .filter((name): name is string => !!name);
    const assigneeNames =
      assigneeNamesFromIds.length > 0
        ? [...new Set(assigneeNamesFromIds)]
        : nameCandidates;

    return {
      ...item,
      assigneeId: assigneeIds[0],
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      assigneeName: assigneeNames[0],
      assigneeNames: assigneeNames.length > 0 ? assigneeNames : undefined,
    };
  });
}
