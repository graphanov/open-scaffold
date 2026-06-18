import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATTEMPT_COMPARISON_SCHEMA = 'open-scaffold.attempt-comparison.v1';

type AttemptFileName = 'diff.patch' | 'rationale.txt' | 'transcript.md' | 'ac-status.json';

export interface AttemptCriterionStatus { id: string; text: string; status: string | null; }
type AttemptFileState = { present: boolean; bytes: number };

export interface BareAttemptSummary {
  name: string; path: string; files: Record<AttemptFileName, AttemptFileState>;
  diff: { present: boolean; changedFiles: string[]; additions: number; deletions: number };
  rationale: { present: boolean; text: string }; transcript: AttemptFileState;
  acStatus: { present: boolean; score: number | null; scoreLabel: string | null; criteria: AttemptCriterionStatus[] };
  warnings: string[];
}

export interface AttemptCriterionDelta { id: string; text: string; aStatus: string | null; bStatus: string | null; }

export interface BareAttemptComparison {
  schema: typeof ATTEMPT_COMPARISON_SCHEMA;
  attempts: { a: BareAttemptSummary; b: BareAttemptSummary };
  summary: { changedFiles: string[]; additionsDelta: number; deletionsDelta: number; scoreDelta: number | null };
  diff: { changedFiles: string[]; onlyInA: string[]; onlyInB: string[]; inBoth: string[] };
  acceptanceCriteria: { rows: AttemptCriterionDelta[]; aPresent: boolean; bPresent: boolean };
  warnings: string[];
  boundary: { runtimeSpawning: false; automaticScoring: false; modelBenchmarking: false; frontierPromotion: false };
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

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const packagedCompareExamplePrefix = 'examples/attempt-compare/';
const packagedProofExamplePrefix = 'examples/proof/';

function normalizeRelativePath(pathArg: string): string {
  return normalize(pathArg).split(sep).join('/').replace(/^\.\/+/, '');
}

function resolveAttemptDirectory(pathArg: string): string {
  const callerRelative = resolve(pathArg);
  if (existsSync(callerRelative)) return callerRelative;
  if (isAbsolute(pathArg)) return callerRelative;

  const normalized = normalizeRelativePath(pathArg);
  if (normalized === '..' || normalized.startsWith('../')) return callerRelative;
  if (normalized === 'examples/attempt-compare' || normalized.startsWith(packagedCompareExamplePrefix)) {
    const packagedPath = join(packageRoot, ...normalized.split('/'));
    if (existsSync(packagedPath)) return packagedPath;
  }

  return callerRelative;
}

function normalizeChangedFile(value: string): string | null {
  const withoutTimestamp = value.split('\t', 1)[0];
  const trimmed = withoutTimestamp.trim();
  if (!trimmed || trimmed === '/dev/null') return null;
  return trimmed.replace(/^[ab]\//, '');
}

function diffSummary(diffText: string): { changedFiles: string[]; additions: number; deletions: number } {
  const files = new Set<string>();
  let additions = 0;
  let deletions = 0;
  let pendingMinusFile: string | null = null;
  for (const line of diffText.split('\n')) {
    const gitMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (gitMatch) {
      const normalized = normalizeChangedFile(gitMatch[2]);
      if (normalized) files.add(normalized);
      pendingMinusFile = null;
      continue;
    }
    const minusMatch = line.match(/^---\s+(.+)$/);
    if (minusMatch) {
      pendingMinusFile = normalizeChangedFile(minusMatch[1]);
      continue;
    }
    const plusMatch = line.match(/^\+\+\+\s+(.+)$/);
    if (plusMatch) {
      const normalized = normalizeChangedFile(plusMatch[1]);
      if (normalized) files.add(normalized);
      else if (pendingMinusFile) files.add(pendingMinusFile);
      pendingMinusFile = null;
      continue;
    }
    if (line.startsWith('+') && !/^\+\+\+\s+/.test(line)) additions += 1;
    if (line.startsWith('-') && !/^---\s+/.test(line)) deletions += 1;
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
  const absolute = resolveAttemptDirectory(pathArg);
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

function formatScore(score: number | null): string { return score === null ? '—' : Number(score.toFixed(6)).toString(); }

function formatDelta(delta: number | null): string {
  const rounded = delta === null ? null : Number(delta.toFixed(6));
  return rounded === null ? '—' : rounded === 0 ? '0' : `${rounded > 0 ? '+' : ''}${rounded} ${rounded > 0 ? '▲' : '▼'}`;
}

function formatCountDelta(delta: number): string { return delta === 0 ? '0' : `${delta > 0 ? '+' : ''}${delta}`; }

function formatStatus(status: string | null): string {
  return status === null ? '—' : ({ pass: '✓ pass', fail: '✗ fail', partial: '◐ partial', blocked: 'blocked', not_evaluated: 'not evaluated' }[status] ?? status);
}

function statusMarker(aStatus: string | null, bStatus: string | null): string {
  return aStatus === bStatus || bStatus === null ? '' : bStatus === 'pass' && aStatus !== 'pass' ? ' ▲' : aStatus === 'pass' && bStatus !== 'pass' ? ' ▼' : ' changed';
}

function escapeCell(value: string): string { return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>'); }

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

export const PROOF_COMPARISON_SCHEMA = 'open-scaffold.proof-comparison.v1', PROOF_COMPARISON_RESULT_SCHEMA = 'open-scaffold.proof-comparison-result.v1';
export type ProofRenderFormat = 'terminal' | 'markdown' | 'json';
type ProofCategory = 'quality' | 'tokens' | 'speed' | 'evolution'; type ProofDirection = 'higher' | 'lower'; type ProofWinner = 'scaffolded' | 'control' | 'tie'; type ProofRatio = number | 'unbounded' | null;
type ProofEvidenceKind = 'cold_resume_fixture' | 'cold_resume_packet' | 'human_reviewer_replication' | 'controlled_ablation' | 'legacy_fixture' | 'reviewability_fixture' | 'other';
type ProofEvidenceStatus = 'demonstrated' | 'reproduced' | 'partially_reproduced' | 'not_reproduced' | 'not_demonstrated' | 'mixed_not_proven' | 'blocked';
type ProofIssue = { level: 'fail' | 'warn'; code: string; message: string; path?: string }; type ProofValidationResult = { failures: ProofIssue[]; warnings: ProofIssue[] };
type ProofMetric = { id: string; label: string; category: ProofCategory; unit: string; direction: ProofDirection; control: number; scaffolded: number; source_refs: string[]; notes?: string | null; minimum_ratio?: number | null };
type ProofEvidenceItem = { id: string; kind: ProofEvidenceKind; status: ProofEvidenceStatus; requiredForPass: boolean; claim: string; boundary: string; sourceRefs: string[]; notes?: string | null };
const PROOF_CATEGORIES: ProofCategory[] = ['quality', 'tokens', 'speed', 'evolution'];
const PROOF_EVIDENCE_KINDS: ProofEvidenceKind[] = ['cold_resume_fixture', 'cold_resume_packet', 'human_reviewer_replication', 'controlled_ablation', 'legacy_fixture', 'reviewability_fixture', 'other'];
const PROOF_EVIDENCE_STATUSES: ProofEvidenceStatus[] = ['demonstrated', 'reproduced', 'partially_reproduced', 'not_reproduced', 'not_demonstrated', 'mixed_not_proven', 'blocked'];
const PROOF_EVIDENCE_PASS_STATUSES = new Set<ProofEvidenceStatus>(['demonstrated', 'reproduced']);
const proofStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
const proofIssue = (level: 'fail' | 'warn', code: string, message: string, path?: string): ProofIssue => ({ level, code, message, path });
const proofArm = (value: unknown, fallback: string) => { const raw = isRecord(value) ? value : {}; return { id: asString(raw.id)?.trim() || fallback, label: asString(raw.label)?.trim() || fallback, runtime: asString(raw.runtime) }; };
const proofRefIsPrivate = (ref: string) => /^[a-z]+:\/\//i.test(ref) || isAbsolute(ref) || normalizeRelativePath(ref).startsWith('../') || ['.git/', '.claude/', '.clawhip/', '.omc/', '.omx/', '.osc-dev/', '.osc/state/', '.osc/research/', '.osc/runs/', '.osc/reviews/.tmp/', '.hermes/', 'node_modules/'].some((prefix) => normalizeRelativePath(ref) === prefix.slice(0, -1) || normalizeRelativePath(ref).startsWith(prefix));
const proofRefExists = (manifestDir: string, ref: string) => existsSync(resolve(manifestDir, ref)) && statSync(resolve(manifestDir, ref)).isFile();
function proofMetric(value: unknown, index: number, manifestDir: string, failures: ProofIssue[], warnings: ProofIssue[]): ProofMetric | null {
  const path = `metrics[${index}]`;
  if (!isRecord(value)) { failures.push(proofIssue('fail', 'invalid-metric', 'Metric must be an object.', path)); return null; }
  const id = asString(value.id)?.trim() || null, label = asString(value.label)?.trim() || null, category = asString(value.category) as ProofCategory | null, unit = asString(value.unit)?.trim() || null, direction = asString(value.direction) as ProofDirection | null, control = asNumber(value.control), scaffolded = asNumber(value.scaffolded), refs = proofStrings(value.source_refs), minimumRatio = asNumber(value.minimum_ratio);
  for (const [bad, code, message, suffix] of [[!id, 'missing-metric-id', 'Metric must include id.', 'id'], [!label, 'missing-metric-label', 'Metric must include label.', 'label'], [!category || !PROOF_CATEGORIES.includes(category), 'invalid-category', `Metric category must be one of: ${PROOF_CATEGORIES.join(', ')}.`, 'category'], [!unit, 'missing-unit', 'Metric must include unit.', 'unit'], [!direction || !['higher', 'lower'].includes(direction), 'invalid-direction', 'Metric direction must be higher or lower.', 'direction'], [control === null, 'invalid-control-value', 'Metric control value must be a finite number.', 'control'], [scaffolded === null, 'invalid-scaffolded-value', 'Metric scaffolded value must be a finite number.', 'scaffolded'], [refs.length === 0, 'missing-source-ref', 'Metric must include at least one source_refs entry.', 'source_refs']] as const) if (bad) failures.push(proofIssue('fail', code, message, `${path}.${suffix}`));
  for (const ref of refs) proofRefIsPrivate(ref) ? failures.push(proofIssue('fail', 'private-source-ref', `Source ref must be repo/public-safe and relative, not private: ${ref}`, `${path}.source_refs`)) : !proofRefExists(manifestDir, ref) && failures.push(proofIssue('fail', 'missing-source-ref', `Source ref does not exist: ${ref}`, `${path}.source_refs`));
  if (Object.hasOwn(value, 'minimum_ratio') && (minimumRatio === null || minimumRatio <= 1)) failures.push(proofIssue('fail', 'invalid-minimum-ratio', 'minimum_ratio must be a finite number greater than 1 when present.', `${path}.minimum_ratio`));
  if (category === 'tokens' && direction !== 'lower') warnings.push(proofIssue('warn', 'unexpected-token-direction', 'Token metrics normally use direction: lower.', `${path}.direction`));
  if (category === 'speed' && direction !== 'lower') warnings.push(proofIssue('warn', 'unexpected-speed-direction', 'Speed metrics normally use direction: lower.', `${path}.direction`));
  return id && label && category && PROOF_CATEGORIES.includes(category) && unit && direction && ['higher', 'lower'].includes(direction) && control !== null && scaffolded !== null ? { id, label, category, unit, direction, control, scaffolded, source_refs: refs, notes: asString(value.notes), minimum_ratio: minimumRatio } : null;
}
function proofEvidenceItem(value: unknown, index: number, manifestDir: string, failures: ProofIssue[]): ProofEvidenceItem | null {
  const path = `evidence_battery[${index}]`;
  if (!isRecord(value)) { failures.push(proofIssue('fail', 'invalid-evidence-item', 'Evidence-battery item must be an object.', path)); return null; }
  const id = asString(value.id)?.trim() || null, kind = asString(value.kind) as ProofEvidenceKind | null, status = asString(value.status) as ProofEvidenceStatus | null, claim = asString(value.claim)?.trim() || null, boundary = asString(value.boundary)?.trim() || null, refs = proofStrings(value.source_refs);
  const requiredForPass = typeof value.required_for_pass === 'boolean' ? value.required_for_pass : false;
  for (const [bad, code, message, suffix] of [[!id, 'missing-evidence-id', 'Evidence-battery item must include id.', 'id'], [!kind || !PROOF_EVIDENCE_KINDS.includes(kind), 'invalid-evidence-kind', `Evidence-battery kind must be one of: ${PROOF_EVIDENCE_KINDS.join(', ')}.`, 'kind'], [!status || !PROOF_EVIDENCE_STATUSES.includes(status), 'invalid-evidence-status', `Evidence-battery status must be one of: ${PROOF_EVIDENCE_STATUSES.join(', ')}.`, 'status'], [!claim, 'missing-evidence-claim', 'Evidence-battery item must include a bounded claim.', 'claim'], [!boundary, 'missing-evidence-boundary', 'Evidence-battery item must include a boundary statement.', 'boundary'], [refs.length === 0, 'missing-source-ref', 'Evidence-battery item must include at least one source_refs entry.', 'source_refs']] as const) if (bad) failures.push(proofIssue('fail', code, message, `${path}.${suffix}`));
  if (Object.hasOwn(value, 'required_for_pass') && typeof value.required_for_pass !== 'boolean') failures.push(proofIssue('fail', 'invalid-evidence-required-for-pass', 'required_for_pass must be boolean when present.', `${path}.required_for_pass`));
  for (const ref of refs) proofRefIsPrivate(ref) ? failures.push(proofIssue('fail', 'private-source-ref', `Source ref must be repo/public-safe and relative, not private: ${ref}`, `${path}.source_refs`)) : !proofRefExists(manifestDir, ref) && failures.push(proofIssue('fail', 'missing-source-ref', `Source ref does not exist: ${ref}`, `${path}.source_refs`));
  return id && kind && PROOF_EVIDENCE_KINDS.includes(kind) && status && PROOF_EVIDENCE_STATUSES.includes(status) && claim && boundary && refs.length > 0 ? { id, kind, status, requiredForPass, claim, boundary, sourceRefs: refs, notes: asString(value.notes) } : null;
}
function proofEvidenceBattery(raw: Record<string, unknown>, manifestDir: string, failures: ProofIssue[]): ProofEvidenceItem[] {
  if (!Object.hasOwn(raw, 'evidence_battery')) return [];
  if (!Array.isArray(raw.evidence_battery)) { failures.push(proofIssue('fail', 'invalid-evidence-battery', 'evidence_battery must be an array when present.', 'evidence_battery')); return []; }
  return raw.evidence_battery.map((item, index) => proofEvidenceItem(item, index, manifestDir, failures)).filter((item): item is ProofEvidenceItem => Boolean(item));
}
function validateProofRaw(raw: unknown, manifestDir: string): ProofValidationResult {
  const failures: ProofIssue[] = [], warnings: ProofIssue[] = [];
  if (!isRecord(raw)) return { failures: [proofIssue('fail', 'invalid-manifest', 'Proof comparison manifest must be a JSON object.')], warnings };
  if (raw.schema !== PROOF_COMPARISON_SCHEMA) failures.push(proofIssue('fail', 'invalid-schema', `Manifest must declare schema: ${PROOF_COMPARISON_SCHEMA}.`, 'schema'));
  for (const key of ['comparison_id', 'title', 'question']) if (!asString(raw[key])?.trim()) failures.push(proofIssue('fail', `missing-${key.replace('_', '-')}`, `Manifest must include ${key}.`, key));
  const arms = isRecord(raw.arms) ? raw.arms : null;
  if (!arms) failures.push(proofIssue('fail', 'missing-arms', 'Manifest must include arms.control and arms.scaffolded.', 'arms'));
  else for (const label of ['control', 'scaffolded']) { const arm = arms[label]; if (!isRecord(arm)) failures.push(proofIssue('fail', 'invalid-arm', `${label} arm must be an object.`, `arms.${label}`)); else for (const field of ['id', 'label']) if (!asString(arm[field])?.trim()) failures.push(proofIssue('fail', `missing-arm-${field}`, `${label} arm must include ${field}.`, `arms.${label}.${field}`)); }
  if (!Array.isArray(raw.metrics) || raw.metrics.length === 0) failures.push(proofIssue('fail', 'missing-metrics', 'Manifest must include at least one metric.', 'metrics'));
  else { const categories = new Set<ProofCategory>(); raw.metrics.forEach((metric, index) => { const parsed = proofMetric(metric, index, manifestDir, failures, warnings); if (parsed) categories.add(parsed.category); }); for (const category of PROOF_CATEGORIES) if (!categories.has(category)) failures.push(proofIssue('fail', 'missing-required-category', `Manifest must include a ${category} metric.`, 'metrics')); }
  proofEvidenceBattery(raw, manifestDir, failures);
  return { failures, warnings };
}
function resolveProofManifestPath(pathArg: string): string { const callerRelative = resolve(pathArg), normalized = normalizeRelativePath(pathArg); if (existsSync(callerRelative) || isAbsolute(pathArg) || normalized === '..' || normalized.startsWith('../')) return callerRelative; const packagedPath = join(packageRoot, ...normalized.split('/')); return (normalized === 'examples/proof' || normalized.startsWith(packagedProofExamplePrefix)) && existsSync(packagedPath) ? packagedPath : callerRelative; }

export function validateProofManifestFile(pathArg: string): ProofValidationResult {
  try { const manifestPath = resolveProofManifestPath(pathArg); return validateProofRaw(JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown, dirname(manifestPath)); } catch (error) { return { failures: [proofIssue('fail', 'unreadable-manifest', error instanceof Error ? error.message : String(error), pathArg)], warnings: [] }; }
}
const proofWinner = (metric: ProofMetric): ProofWinner => metric.scaffolded === metric.control ? 'tie' : metric.direction === 'higher' ? (metric.scaffolded > metric.control ? 'scaffolded' : 'control') : (metric.scaffolded < metric.control ? 'scaffolded' : 'control');
const proofScaffoldedRatio = (metric: ProofMetric): ProofRatio => metric.direction === 'higher' ? (metric.control === 0 ? (metric.scaffolded > 0 ? 'unbounded' : 1) : metric.scaffolded / metric.control) : (metric.scaffolded === 0 ? (metric.control > 0 ? 'unbounded' : 1) : metric.control / metric.scaffolded);
const proofReportedRatio = (ratio: ProofRatio): ProofRatio => typeof ratio === 'number' ? Math.floor(ratio * 1_000_000) / 1_000_000 : ratio;
const proofRatioPasses = (ratio: ProofRatio, minimumRatio: number | null, winner: ProofWinner) => minimumRatio === null ? null : winner === 'scaffolded' && (ratio === 'unbounded' || (typeof ratio === 'number' && ratio >= minimumRatio));
function proofCategoryStatus(metrics: Array<ProofMetric & { winner: ProofWinner }>, category: ProofCategory) { const scoped = metrics.filter((metric) => metric.category === category); return scoped.length === 0 ? 'missing' : scoped.some((metric) => metric.winner === 'control') ? 'regressed' : scoped.some((metric) => metric.winner === 'scaffolded') ? 'improved' : 'tied'; }
export function compareProofManifest(pathArg: string) {
  const manifestPath = resolveProofManifestPath(pathArg), manifestDir = dirname(manifestPath), raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>, validation = validateProofRaw(raw, manifestDir); if (validation.failures.length > 0) throw new Error(`Invalid proof comparison manifest: ${validation.failures.map((failure) => failure.code).join(', ')}`);
  const metrics = ((raw.metrics as unknown[]) ?? []).map((metric, index) => proofMetric(metric, index, manifestDir, [], [])).filter((metric): metric is ProofMetric => Boolean(metric)).map((metric) => { const winner = proofWinner(metric), thresholdRatio = proofScaffoldedRatio(metric), improvementRatio = proofReportedRatio(thresholdRatio), minimumRatio = metric.minimum_ratio ?? null, minimumRatioPassed = proofRatioPasses(thresholdRatio, minimumRatio, winner); return { ...metric, winner, delta: Number((metric.scaffolded - metric.control).toFixed(6)), improvementRatio, minimumRatio, minimumRatioActual: thresholdRatio, minimumRatioPassed, sourceRefs: metric.source_refs }; });
  const evidenceBattery = proofEvidenceBattery(raw, manifestDir, []), evidenceBatteryBlocking = evidenceBattery.filter((item) => item.requiredForPass && !PROOF_EVIDENCE_PASS_STATUSES.has(item.status)).map((item) => item.id), evidenceBatteryPass = evidenceBatteryBlocking.length === 0;
  const categories = Object.fromEntries(PROOF_CATEGORIES.map((category) => [category, proofCategoryStatus(metrics, category)])) as Record<ProofCategory, 'improved' | 'regressed' | 'tied' | 'missing'>, scaffoldedWins = metrics.filter((metric) => metric.winner === 'scaffolded').length, controlWins = metrics.filter((metric) => metric.winner === 'control').length, ties = metrics.filter((metric) => metric.winner === 'tie').length;
  const thresholdViolations = metrics.filter((metric) => metric.minimumRatioPassed === false).map((metric) => ({ metricId: metric.id, required: metric.minimumRatio, actual: metric.minimumRatioActual })), thresholdsPass = thresholdViolations.length === 0, metricProof = thresholdsPass && categories.quality !== 'missing' && categories.quality !== 'regressed' && categories.evolution === 'improved' && categories.tokens !== 'regressed' && categories.speed !== 'regressed' && controlWins === 0, boundedProof = metricProof && evidenceBatteryPass;
  return { schema: PROOF_COMPARISON_RESULT_SCHEMA, comparisonId: asString(raw.comparison_id) ?? 'proof-comparison', title: asString(raw.title) ?? 'Proof comparison', question: asString(raw.question) ?? 'Does the scaffolded arm improve the bounded comparison?', arms: { control: proofArm(isRecord(raw.arms) ? raw.arms.control : null, 'control'), scaffolded: proofArm(isRecord(raw.arms) ? raw.arms.scaffolded : null, 'scaffolded') }, metrics, evidenceBattery, summary: { scaffoldedWins, controlWins, ties, categories, thresholdsPass, thresholdViolations, evidenceBatteryPass, evidenceBatteryBlocking, boundedProof, verdict: boundedProof ? 'PASS: bounded source-labeled comparison preserves decision quality, satisfies required improvement ratios, passes required evidence-battery items, and improves evolution without token/speed regression.' : !evidenceBatteryPass ? 'FAIL/INCONCLUSIVE: a required evidence-battery item is not demonstrated/reproduced; this claim stays fail-closed until source-labeled evidence exists.' : 'FAIL/INCONCLUSIVE: this bounded comparison does not show the scaffolded arm is better at the required threshold; inspect metric regressions, missing categories, or minimum-ratio failures.' }, caveats: proofStrings(raw.caveats).length > 0 ? proofStrings(raw.caveats) : ['Bounded comparison only; not a universal benchmark or model-ranking claim.'], validation };
}
const proofFmt = (value: ProofRatio) => value === null ? 'n/a' : value === 'unbounded' ? '∞' : Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
export function renderProofComparison(result: ReturnType<typeof compareProofManifest>, format: ProofRenderFormat = 'terminal'): string {
  if (format === 'json') return `${JSON.stringify(result, null, 2)}\n`;
  const batteryLines = result.evidenceBattery.length > 0 ? [
    '',
    format === 'markdown' ? '## Proof battery' : 'Proof battery',
    `Evidence-battery gate: ${result.summary.evidenceBatteryPass ? 'pass' : 'fail'}${result.summary.evidenceBatteryBlocking.length > 0 ? ` (blocking: ${result.summary.evidenceBatteryBlocking.join(', ')})` : ''}`,
    '| Evidence item | Kind | Status | Required | Claim | Boundary | Sources |',
    '|---|---|---|---|---|---|---|',
    ...result.evidenceBattery.map((item) => `| ${item.id} | ${item.kind} | ${item.status} | ${item.requiredForPass ? 'required' : 'disclosure-only'} | ${escapeCell(item.claim)} | ${escapeCell(item.boundary)} | ${item.sourceRefs.join('<br>')} |`),
  ] : [];
  const lines = [format === 'markdown' ? `# ${result.title}` : result.title, '', `Question: ${result.question}`, `Control arm: ${result.arms.control.label} (${result.arms.control.id})`, `Scaffolded arm: ${result.arms.scaffolded.label} (${result.arms.scaffolded.id})`, '', `Bounded proof verdict: ${result.summary.boundedProof ? 'PASS' : 'FAIL/INCONCLUSIVE'}`, result.summary.verdict, `Category status: ${PROOF_CATEGORIES.map((category) => `${category}=${result.summary.categories[category]}`).join(', ')}`, `Minimum ratios: ${result.summary.thresholdsPass ? 'pass' : 'fail'}`, `Evidence battery: ${result.summary.evidenceBatteryPass ? 'pass' : 'fail'}`, `Wins: scaffolded=${result.summary.scaffoldedWins}, control=${result.summary.controlWins}, ties=${result.summary.ties}`, '', '| Metric | Category | Control | Scaffolded | Winner | Ratio | Minimum | Sources |', '|---|---|---:|---:|---|---:|---:|---|', ...result.metrics.map((metric) => `| ${metric.id} | ${metric.category} | ${proofFmt(metric.control)} ${metric.unit} | ${proofFmt(metric.scaffolded)} ${metric.unit} | ${metric.winner} | ${metric.improvementRatio === null ? 'n/a' : `${proofFmt(metric.improvementRatio)}x`} | ${metric.minimumRatio === null ? 'n/a' : `${proofFmt(metric.minimumRatio)}x ${metric.minimumRatioPassed ? 'pass' : 'fail'}`} | ${metric.sourceRefs.join('<br>')} |`), ...batteryLines, '', 'Caveats', ...result.caveats.map((caveat) => `- ${caveat}`), '- This report compares the supplied receipts only. It does not prove all tasks, all models, or all operators will improve; it does not make models smarter, rank models, certify correctness, or authorize release/merge/deploy actions.'];
  return `${lines.join('\n')}\n`;
}
