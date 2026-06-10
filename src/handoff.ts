import { redactSecrets } from './redaction.js';

export const HANDOFF_COMPILER_SCHEMA = 'osc.handoff-compiler.v1';

const REQUIRED_SECTIONS = ['State', 'Decisions', 'Blockers / Open Questions', 'Evidence refs', 'Next Actions'] as const;

export interface HandoffCompilerInput {
  state: string;
  decisions?: string[];
  blockers?: string[];
  evidenceRefs?: string[];
  nextActions?: string[];
  maxChars?: number;
  reason?: string;
}

export interface HandoffValidation {
  status: 'pass' | 'fail';
  missingSections: string[];
  length: number;
  maxChars: number;
  overBudget: boolean;
}

function redactLocalText(value: string): string {
  return redactSecrets(String(value ?? ''))
    .replace(/\/(?:Users|home|tmp|private|var|Volumes)\/[^\s`'"),;]+/g, '[local-path omitted]')
    .replace(/[A-Za-z]:\\Users\\[^\s`'"),;]+/g, '[local-path omitted]');
}

function clean(value: string, fallback = 'Not recorded.'): string {
  const text = redactLocalText(value).replace(/\s+/g, ' ').trim();
  return text || fallback;
}

export function redactPacketText(value: string, max = 220, fallback = ''): string {
  const text = redactLocalText(String(value ?? '')).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function bullets(values: string[] | undefined, fallback: string, maxChars = 220): string[] {
  const cleaned = (values ?? []).map((item) => clean(item, '')).filter(Boolean);
  return (cleaned.length ? cleaned : [fallback]).map((item) => `- ${truncate(item, maxChars)}`);
}

function truncate(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function render(input: Required<Omit<HandoffCompilerInput, 'maxChars' | 'reason'>> & { maxChars: number; reason: string }, stateChars: number): string {
  const lines = [
    '# Resume Packet',
    '',
    'Compact, token-efficient handoff. Keep evidence refs, not raw logs.',
    '',
    '## State',
    truncate(input.state, stateChars),
    '',
    '## Decisions',
    ...bullets(input.decisions, 'No durable decisions recorded yet.', 180),
    '',
    '## Blockers / Open Questions',
    ...bullets(input.blockers, 'No known blockers.', 260),
    '',
    '## Evidence refs',
    ...bullets(input.evidenceRefs, 'No evidence refs yet.', 180),
    '',
    '## Next Actions',
    ...bullets(input.nextActions, 'Verify the referenced work before claiming pass.', 180),
    '',
    `Compiler reason: ${truncate(input.reason, 90)}`,
  ];
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

export function validateHandoffPacket(content: string, options: { maxChars?: number } = {}): HandoffValidation {
  const maxChars = options.maxChars ?? 1600;
  const missingSections = REQUIRED_SECTIONS.filter((section) => !new RegExp(`(^|\\n)#{0,3}\\s*${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(content));
  const length = content.length;
  return {
    status: missingSections.length === 0 && length <= maxChars ? 'pass' : 'fail',
    missingSections,
    length,
    maxChars,
    overBudget: length > maxChars,
  };
}

export function compileHandoffPacket(input: HandoffCompilerInput) {
  const maxChars = input.maxChars ?? 1600;
  const normalized = {
    state: input.state ?? '',
    decisions: input.decisions ?? [],
    blockers: input.blockers ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
    nextActions: input.nextActions ?? [],
    maxChars,
    reason: input.reason ?? 'handoff compiler',
  };

  let content = render(normalized, Math.max(120, Math.min(700, Math.floor(maxChars * 0.35))));
  if (content.length > maxChars) content = render(normalized, 220);
  if (content.length > maxChars) content = render({ ...normalized, decisions: normalized.decisions.slice(0, 2), blockers: normalized.blockers.slice(0, 2), evidenceRefs: normalized.evidenceRefs.slice(0, 2), nextActions: normalized.nextActions.slice(0, 2) }, 140);
  if (content.length > maxChars) content = `${content.slice(0, maxChars - 1).trim()}\n`;

  return {
    schema: HANDOFF_COMPILER_SCHEMA,
    content,
    budget: { maxChars, length: content.length },
    validation: validateHandoffPacket(content, { maxChars }),
    boundary: {
      compact_handoff_only: true,
      not_raw_log_dump: true,
      not_approval: true,
    },
  };
}
