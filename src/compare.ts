import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

export const ATTEMPT_COMPARISON_SCHEMA = 'open-scaffold.attempt-comparison.v1';

type AttemptFileName = 'diff.patch' | 'rationale.txt' | 'transcript.md' | 'ac-status.json';

export interface AttemptCriterionStatus {
  id: string;
  text: string;
  status: string | null;
}

export interface BareAttemptSummary {
  name: string;
  path: string;
  files: Record<AttemptFileName, { present: boolean; bytes: number }>;
  diff: {
    present: boolean;
    changedFiles: string[];
    additions: number;
    deletions: number;
  };
  rationale: {
    present: boolean;
    text: string;
  };
  transcript: {
    present: boolean;
    bytes: number;
  };
  acStatus: {
    present: boolean;
    score: number | null;
    scoreLabel: string | null;
    criteria: AttemptCriterionStatus[];
  };
  warnings: string[];
}

export interface AttemptCriterionDelta {
  id: string;
  text: string;
  aStatus: string | null;
  bStatus: string | null;
}

export interface BareAttemptComparison {
  schema: typeof ATTEMPT_COMPARISON_SCHEMA;
  attempts: {
    a: BareAttemptSummary;
    b: BareAttemptSummary;
  };
  summary: {
    changedFiles: string[];
    additionsDelta: number;
    deletionsDelta: number;
    scoreDelta: number | null;
  };
  diff: {
    changedFiles: string[];
    onlyInA: string[];
    onlyInB: string[];
    inBoth: string[];
  };
  acceptanceCriteria: {
    rows: AttemptCriterionDelta[];
    aPresent: boolean;
    bPresent: boolean;
  };
  warnings: string[];
  boundary: {
    runtimeSpawning: false;
    automaticScoring: false;
    modelBenchmarking: false;
    frontierPromotion: false;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function meaningfulString(value: string): boolean {
  return value.trim().length > 0 && !/^(todo|tbd|n\/a|none)$/i.test(value.trim());
}

function readOptionalFile(dir: string, name: AttemptFileName, readContent = true): { present: boolean; bytes: number; content: string } {
  const path = resolve(dir, name);
  if (!existsSync(path)) return { present: false, bytes: 0, content: '' };
  const stat = statSync(path);
  if (!stat.isFile()) return { present: false, bytes: 0, content: '' };
  const content = readContent ? readFileSync(path, 'utf8') : '';
  return { present: true, bytes: stat.size, content };
}

function normalizeChangedFile(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/dev/null') return null;
  return trimmed.replace(/^[ab]\//, '');
}

function diffSummary(diffText: string): { changedFiles: string[]; additions: number; deletions: number } {
  const files = new Set<string>();
  let additions = 0;
  let deletions = 0;
  for (const line of diffText.split('\n')) {
    const gitMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gitMatch) {
      const normalized = normalizeChangedFile(gitMatch[2]);
      if (normalized) files.add(normalized);
      continue;
    }
    const plusMatch = line.match(/^\+\+\+\s+(.+)$/);
    if (plusMatch) {
      const normalized = normalizeChangedFile(plusMatch[1]);
      if (normalized) files.add(normalized);
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) additions += 1;
    if (line.startsWith('-') && !line.startsWith('---')) deletions += 1;
  }
  return { changedFiles: [...files].sort(), additions, deletions };
}

function normalizeCriteria(raw: unknown): AttemptCriterionStatus[] {
  const container = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.criteria)
      ? raw.criteria
      : isRecord(raw) && Array.isArray(raw.acceptance_criteria)
        ? raw.acceptance_criteria
        : [];
  return container.filter(isRecord).map((criterion, index) => ({
    id: asString(criterion.id) ?? `AC${index + 1}`,
    text: asString(criterion.text) ?? asString(criterion.title) ?? asString(criterion.id) ?? `AC${index + 1}`,
    status: asString(criterion.status),
  }));
}

function parseAcStatus(content: string): { score: number | null; scoreLabel: string | null; criteria: AttemptCriterionStatus[] } {
  if (!meaningfulString(content)) return { score: null, scoreLabel: null, criteria: [] };
  const parsed = JSON.parse(content) as unknown;
  return {
    score: isRecord(parsed) ? asNumber(parsed.score) : null,
    scoreLabel: isRecord(parsed) ? asString(parsed.score_label) ?? asString(parsed.scoreLabel) : null,
    criteria: normalizeCriteria(parsed),
  };
}

function loadBareAttempt(pathArg: string, label: 'attempt-a' | 'attempt-b'): BareAttemptSummary {
  const absolute = resolve(pathArg);
  if (!existsSync(absolute)) throw new Error(`${label}: attempt folder does not exist: ${pathArg}`);
  if (!statSync(absolute).isDirectory()) throw new Error(`${label}: attempt path must be a directory: ${pathArg}`);

  const diffFile = readOptionalFile(absolute, 'diff.patch');
  const rationaleFile = readOptionalFile(absolute, 'rationale.txt');
  const transcriptFile = readOptionalFile(absolute, 'transcript.md', false);
  const acStatusFile = readOptionalFile(absolute, 'ac-status.json');
  const warnings: string[] = [];

  for (const file of [diffFile.present ? null : 'diff.patch', rationaleFile.present ? null : 'rationale.txt', transcriptFile.present ? null : 'transcript.md', acStatusFile.present ? null : 'ac-status.json'].filter(Boolean) as AttemptFileName[]) {
    warnings.push(`${label}: missing optional \`${file}\``);
  }

  const meaningfulDiff = diffFile.present && meaningfulString(diffFile.content);
  const rationaleText = rationaleFile.content.trim();
  const meaningfulRationale = rationaleFile.present && meaningfulString(rationaleText);
  if (!meaningfulDiff && !meaningfulRationale) {
    throw new Error(`Each attempt must include meaningful \`diff.patch\` or \`rationale.txt\` (${label} did not).`);
  }

  const diff = diffSummary(diffFile.content);
  let acStatus = { score: null as number | null, scoreLabel: null as string | null, criteria: [] as AttemptCriterionStatus[] };
  if (acStatusFile.present && meaningfulString(acStatusFile.content)) {
    try {
      acStatus = parseAcStatus(acStatusFile.content);
    } catch (error) {
      throw new Error(`${label}: invalid ac-status.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    name: basename(absolute),
    path: pathArg,
    files: {
      'diff.patch': { present: diffFile.present, bytes: diffFile.bytes },
      'rationale.txt': { present: rationaleFile.present, bytes: rationaleFile.bytes },
      'transcript.md': { present: transcriptFile.present, bytes: transcriptFile.bytes },
      'ac-status.json': { present: acStatusFile.present, bytes: acStatusFile.bytes },
    },
    diff: {
      present: meaningfulDiff,
      changedFiles: diff.changedFiles,
      additions: diff.additions,
      deletions: diff.deletions,
    },
    rationale: {
      present: meaningfulRationale,
      text: meaningfulRationale ? rationaleText : '',
    },
    transcript: {
      present: transcriptFile.present,
      bytes: transcriptFile.bytes,
    },
    acStatus: {
      present: acStatusFile.present,
      score: acStatus.score,
      scoreLabel: acStatus.scoreLabel,
      criteria: acStatus.criteria,
    },
    warnings,
  };
}

function setDelta(a: string[], b: string[]) {
  const aSet = new Set(a);
  const bSet = new Set(b);
  return {
    onlyInA: a.filter((item) => !bSet.has(item)),
    onlyInB: b.filter((item) => !aSet.has(item)),
    inBoth: a.filter((item) => bSet.has(item)),
  };
}

function acceptanceCriteriaDelta(a: AttemptCriterionStatus[], b: AttemptCriterionStatus[]) {
  const rows = new Map<string, AttemptCriterionDelta>();
  for (const criterion of a) {
    rows.set(criterion.id, { id: criterion.id, text: criterion.text, aStatus: criterion.status, bStatus: null });
  }
  for (const criterion of b) {
    const existing = rows.get(criterion.id);
    if (existing) {
      existing.text = existing.text || criterion.text;
      existing.bStatus = criterion.status;
    } else {
      rows.set(criterion.id, { id: criterion.id, text: criterion.text, aStatus: null, bStatus: criterion.status });
    }
  }
  return [...rows.values()];
}

export function compareBareAttempts(attemptAPath: string, attemptBPath: string): BareAttemptComparison {
  const a = loadBareAttempt(attemptAPath, 'attempt-a');
  const b = loadBareAttempt(attemptBPath, 'attempt-b');
  const diff = setDelta(a.diff.changedFiles, b.diff.changedFiles);
  const scoreDelta = a.acStatus.score !== null && b.acStatus.score !== null
    ? Number((b.acStatus.score - a.acStatus.score).toFixed(6))
    : null;
  const rows = acceptanceCriteriaDelta(a.acStatus.criteria, b.acStatus.criteria);
  return {
    schema: ATTEMPT_COMPARISON_SCHEMA,
    attempts: { a, b },
    summary: {
      changedFiles: [...new Set([...a.diff.changedFiles, ...b.diff.changedFiles])].sort(),
      additionsDelta: b.diff.additions - a.diff.additions,
      deletionsDelta: b.diff.deletions - a.diff.deletions,
      scoreDelta,
    },
    diff: {
      changedFiles: [...new Set([...a.diff.changedFiles, ...b.diff.changedFiles])].sort(),
      ...diff,
    },
    acceptanceCriteria: {
      rows,
      aPresent: a.acStatus.present,
      bPresent: b.acStatus.present,
    },
    warnings: [...a.warnings, ...b.warnings],
    boundary: {
      runtimeSpawning: false,
      automaticScoring: false,
      modelBenchmarking: false,
      frontierPromotion: false,
    },
  };
}

function formatScore(score: number | null): string {
  return score === null ? '—' : Number(score.toFixed(6)).toString();
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  const rounded = Number(delta.toFixed(6));
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : ''}${rounded} ${rounded > 0 ? '▲' : '▼'}`;
}

function formatCountDelta(delta: number): string {
  if (delta === 0) return '0';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function formatStatus(status: string | null): string {
  switch (status) {
    case 'pass':
      return '✓ pass';
    case 'fail':
      return '✗ fail';
    case 'partial':
      return '◐ partial';
    case 'blocked':
      return 'blocked';
    case 'not_evaluated':
      return 'not evaluated';
    case null:
      return '—';
    default:
      return status;
  }
}

function statusMarker(aStatus: string | null, bStatus: string | null): string {
  if (aStatus === bStatus || bStatus === null) return '';
  if (bStatus === 'pass' && aStatus !== 'pass') return ' ▲';
  if (aStatus === 'pass' && bStatus !== 'pass') return ' ▼';
  return ' changed';
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function diffText(attempt: BareAttemptSummary): string {
  const files = attempt.diff.changedFiles.length > 0 ? attempt.diff.changedFiles.join(', ') : '—';
  return `${files} (${attempt.diff.additions}+/${attempt.diff.deletions}-)`;
}

function scoreLabel(comparison: BareAttemptComparison): string {
  const labels = [comparison.attempts.a.acStatus.scoreLabel, comparison.attempts.b.acStatus.scoreLabel].filter(Boolean);
  return labels.length > 0 ? `User-provided score (${[...new Set(labels)].join(', ')}; not automatic benchmark)` : 'User-provided score (not automatic benchmark)';
}

export function renderAttemptComparisonMarkdown(comparison: BareAttemptComparison): string {
  const { a, b } = comparison.attempts;
  const lines = [
    `# Attempt comparison: ${a.name} → ${b.name}`,
    '',
    '| Field | Attempt A | Attempt B | Δ |',
    '|---|---|---|---|',
    `| Path | \`${escapeCell(a.path)}\` | \`${escapeCell(b.path)}\` | — |`,
    `| Rationale present | ${a.rationale.present ? 'yes' : 'no'} | ${b.rationale.present ? 'yes' : 'no'} | ${a.rationale.present === b.rationale.present ? '—' : 'changed'} |`,
    `| Diff summary | ${escapeCell(diffText(a))} | ${escapeCell(diffText(b))} | additions ${formatCountDelta(comparison.summary.additionsDelta)}, deletions ${formatCountDelta(comparison.summary.deletionsDelta)} |`,
    `| ${escapeCell(scoreLabel(comparison))} | ${formatScore(a.acStatus.score)} | ${formatScore(b.acStatus.score)} | ${formatDelta(comparison.summary.scoreDelta)} |`,
    `| Transcript captured | ${a.transcript.present ? `${a.transcript.bytes} bytes` : '—'} | ${b.transcript.present ? `${b.transcript.bytes} bytes` : '—'} | metadata only |`,
    '',
    '## Summary',
    '',
    `- Changed files: ${comparison.summary.changedFiles.length > 0 ? comparison.summary.changedFiles.map((file) => `\`${file}\``).join(', ') : '—'}`,
    '- Scores are user-provided judgment metadata when present; Open Scaffold does not auto-rank or benchmark attempts.',
    '- This command reads local files only. It does not spawn runtimes, promote a frontier, or approve work.',
    '',
    '## Rationale',
    '',
    `**A:** ${a.rationale.text || '—'}`,
    '',
    `**B:** ${b.rationale.text || '—'}`,
    '',
    ...(comparison.acceptanceCriteria.rows.length > 0 ? [
      '## Acceptance criteria delta',
      '',
      '| Criterion | A | B |',
      '|---|---|---|',
      ...comparison.acceptanceCriteria.rows.map((row) => `| ${escapeCell(`${row.id} — ${row.text}`)} | ${escapeCell(formatStatus(row.aStatus))} | ${escapeCell(formatStatus(row.bStatus))}${statusMarker(row.aStatus, row.bStatus)} |`),
      '',
    ] : []),
    '## Diff files',
    '',
    `- Only in A: ${comparison.diff.onlyInA.length > 0 ? comparison.diff.onlyInA.map((file) => `\`${file}\``).join(', ') : '—'}`,
    `- Only in B: ${comparison.diff.onlyInB.length > 0 ? comparison.diff.onlyInB.map((file) => `\`${file}\``).join(', ') : '—'}`,
    `- In both: ${comparison.diff.inBoth.length > 0 ? comparison.diff.inBoth.map((file) => `\`${file}\``).join(', ') : '—'}`,
    '',
    ...(comparison.warnings.length > 0 ? [
      '## Warnings',
      '',
      ...comparison.warnings.map((warning) => `- ${warning}`),
      '',
    ] : []),
  ];
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

export function renderAttemptComparisonJson(comparison: BareAttemptComparison): string {
  return `${JSON.stringify(comparison, null, 2)}\n`;
}
