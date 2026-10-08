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
    .replace(/(^|[\s`'"(,;])\/(?:workspace|workspaces|workdir|repo)(?=$|[\s`'"),;])/g, '$1[local-path omitted]')
    .replace(/(^|[\s`'"(,;])\/(?!\/)(?:[A-Za-z0-9._-]+\/)+[^\s`'"),;]+/g, '$1[local-path omitted]')
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

function render(input: HandoffCompilerInput, stateChars: number, maxChars = Infinity): string {
  const bodies = [
    [truncate(input.state ?? '', stateChars)],
    bullets(input.decisions, 'No durable decisions recorded yet.', 180),
    bullets(input.blockers, 'No known blockers.', 260),
    bullets(input.evidenceRefs, 'No evidence refs yet.', 180),
    bullets(input.nextActions, 'Verify the referenced work before claiming pass.', 180),
    [truncate(input.reason ?? 'handoff compiler', 90)],
  ];
  const assemble = () => [
    '# Resume Packet', '', 'Compact, token-efficient handoff. Keep evidence refs, not raw logs.', '',
    ...REQUIRED_SECTIONS.flatMap((section, index) => [`## ${section}`, ...bodies[index].filter(Boolean), '']),
    `Compiler reason: ${bodies[5][0]}`, '',
  ].join('\n');
  let content = assemble();
  // Headings and wrapper are fixed; only already-redacted body lines may shrink.
  while (content.length > maxChars) {
    let target = { section: 0, index: 0 };
    bodies.forEach((values, section) => values.forEach((value, index) => {
      if (value.length > bodies[target.section][target.index].length) target = { section, index };
    }));
    const value = bodies[target.section][target.index];
    if (!value) break; // The structural minimum remains an explicit over-budget failure.
    const bodyChars = bodies.flat().reduce((sum, body) => sum + body.length, 0);
    const reduction = Math.max(1, Math.ceil((content.length - maxChars) * value.length / bodyChars));
    const limit = Math.max(0, value.length - reduction);
    bodies[target.section][target.index] = limit > (value.startsWith('- ') ? 3 : 0)
      ? `${value.slice(0, limit - 1).trimEnd()}…` : '';
    content = assemble();
  }
  return content;
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
  let content = render(input, Math.max(120, Math.min(700, Math.floor(maxChars * 0.35))));
  if (content.length > maxChars) content = render(input, 220);
  if (content.length > maxChars) {
    const limited = { ...input };
    for (const field of ['decisions', 'blockers', 'evidenceRefs', 'nextActions'] as const) limited[field] = input[field]?.slice(0, 2);
    content = render(limited, 140, maxChars);
  }

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
