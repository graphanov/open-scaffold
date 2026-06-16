import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(fixtureRoot, 'prompts');
mkdirSync(promptsDir, { recursive: true });

const facts = {
  plan: 'bounded-invoice-importer-resume',
  objective: 'Resume a paused invoice-importer slice from recorded facts without rereading the whole session history.',
  currentAttempt: 'attempt-f-closeout-candidate',
  frontierAttempt: 'attempt-f-closeout-candidate',
  evaluation: 'docs/evidence/attempt-f-evaluation.json',
  action: 'closeout',
  acceptance: [
    ['AC1', 'Quoted invoice descriptions with embedded commas parse correctly.', 'pass'],
    ['AC2', 'Malformed rows report row and column for the offending token.', 'pass'],
    ['AC3', 'UTF-8 BOM is stripped before first-field parsing.', 'pass'],
    ['AC4', 'Duplicate invoice ids are rejected with a reviewer-readable error.', 'pass'],
    ['AC5', 'Evidence note links parser tests, reviewer transcript, and final run receipt.', 'pass'],
  ],
  decisions: [
    'attempt-b-regression was rejected because it fixed AC2 but broke AC3.',
    'attempt-d-wide-refactor was rejected because it increased surface area without improving acceptance.',
    'attempt-f-closeout-candidate is the current frontier because all five acceptance criteria pass.',
    'No new implementation attempt is authorized; the next action is human closeout/approval routing.',
  ],
  requiredNextFields: [
    'human_approval_or_closeout_decision',
    'release_evidence_note',
    'next_slice_or_done_routing',
  ],
  evidenceRefs: [
    'docs/evidence/attempt-f-evaluation.json',
    'docs/evidence/attempt-f-proof.md',
    '.osc/releases/2026-06-16-bounded-invoice-importer-resume.md',
  ],
};

const answerShape = [
  'Return ONLY compact JSON with these keys:',
  'action, reasons, resume, acceptance, required_next_fields, boundary_note.',
  'A correct answer says action=closeout or stop, current/frontier attempt-f-closeout-candidate, acceptance 5/5 pass with no remaining failures, and includes all required next fields.',
].join(' ');

const rawLog = [];
for (let i = 1; i <= 1400; i += 1) {
  const phase = i % 7 === 0 ? 'review-note' : i % 5 === 0 ? 'test-run' : i % 3 === 0 ? 'agent-thought-summary' : 'terminal-summary';
  const attempt = ['attempt-a-baseline', 'attempt-b-regression', 'attempt-c-row-column', 'attempt-d-wide-refactor', 'attempt-e-evidence-linkage'][i % 5];
  rawLog.push(JSON.stringify({
    ts: `2026-06-16T08:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z`,
    phase,
    attempt,
    observed: `Replay filler event ${i}: retained for chronology only. It is not the final frontier. Inspect the ledger and final evaluation before deciding.`,
    checksum_hint: `chunk-${String(i).padStart(4, '0')}-source-fact-log`,
  }));
  if (i % 175 === 0) {
    rawLog.push(JSON.stringify({
      ts: `2026-06-16T09:${String(i / 175).padStart(2, '0')}:00.000Z`,
      phase: 'operator-ledger',
      attempt: facts.currentAttempt,
      observed: `Important ledger reminder: ${facts.currentAttempt} has 5/5 acceptance criteria passing; next action is closeout, not another implementation retry.`,
      evidence: facts.evidenceRefs,
    }));
  }
}

const rawEvaluation = {
  schema: 'open-scaffold.evaluation.v1',
  evaluation_id: 'eval-attempt-f-closeout-candidate',
  subject: { plan_slug: facts.plan, run_id: facts.currentAttempt },
  acceptance_criteria: facts.acceptance.map(([id, text, status]) => ({ id, text, status })),
  decision: {
    status: 'approved',
    approver: 'operator',
    rationale: 'All acceptance criteria pass in the recorded evaluation envelope; this is evidence for closeout routing, not release approval.',
  },
  improvement: {
    route: 'closeout',
    target: facts.currentAttempt,
    carried_forward: facts.decisions,
    do_not_assume: ['No merge, publish, release, deployment, or compliance approval is granted by this packet.'],
  },
  evidence_refs: facts.evidenceRefs,
};

const controlPrompt = [
  'You are naked Codex without Open Scaffold helper commands. Do not run tools.',
  'You are given raw local session and work-record artifacts from a long paused AI work slice.',
  'Decide the next controller action from the raw artifacts only.',
  answerShape,
  '',
  '## Task',
  facts.objective,
  '',
  '## Raw transcript/session-log.jsonl',
  '```jsonl',
  rawLog.join('\n'),
  '```',
  '',
  '## Raw final evaluation envelope',
  '```json',
  JSON.stringify(rawEvaluation, null, 2),
  '```',
  '',
  '## Raw operator closeout note',
  facts.decisions.map((decision) => `- ${decision}`).join('\n'),
  '',
  `Required next fields: ${facts.requiredNextFields.join(', ')}`,
  `Boundary: this is decision support only. It is not merge, publish, release, deployment, compliance, or owner approval.`,
  '',
].join('\n');

const scaffoldPrompt = [
  'You are Codex instantiated through Open Scaffold. Do not run tools.',
  'Use this Open Scaffold compact resume packet as the source of truth.',
  answerShape,
  '',
  '# Open Scaffold Resume Capsule',
  `Plan: ${facts.plan}`,
  `Objective: ${facts.objective}`,
  `Action: ${facts.action}`,
  `Resume: current=${facts.currentAttempt} | frontier=${facts.frontierAttempt} | evaluation=${facts.evaluation}`,
  'Acceptance: 5/5 pass | remaining=none',
  `Reasons: ${facts.decisions.join(' ')}`,
  `Required next fields: ${facts.requiredNextFields.join(', ')}`,
  `Evidence refs: ${facts.evidenceRefs.join(', ')}`,
  'Boundary: handoff/decision support only; not merge, publish, release, deployment, compliance, or owner approval.',
  '',
].join('\n');

writeFileSync(join(promptsDir, 'control-naked-raw-prompt.txt'), controlPrompt, 'utf8');
writeFileSync(join(promptsDir, 'scaffolded-resume-capsule-prompt.md'), scaffoldPrompt, 'utf8');

