export interface SchemaRegistryEntry {
  id: string;
  owner: string;
  maturity: 'stable' | 'lab' | 'advanced' | 'future';
  emittedBy: string[];
  shape: string;
}

export const SCHEMA_REGISTRY: SchemaRegistryEntry[] = [
  { id: 'open-scaffold.run.v1', owner: 'src/artifacts.ts', maturity: 'stable', emittedBy: ['osc run', 'osc delegate', 'osc review', 'osc ultrareview'], shape: 'Run packet under .osc/runs/<run_id>/run.json with plan, runtime selection, bindings, artifacts, questions, and commit policy.' },
  { id: 'open-scaffold.adapter.v1', owner: 'src/dispatch.ts', maturity: 'stable', emittedBy: ['project-local .osc/adapters/<id>.json'], shape: 'Project-local adapter command config with id, command tokens, env allowlist, explicit env, timeout/log caps, and optional worktree-isolation requirement.' },
  { id: 'open-scaffold.trusted_adapters.v1', owner: 'src/adapter-trust.ts', maturity: 'stable', emittedBy: ['osc adapter trust'], shape: 'Gitignored local trust records keyed by adapter id and adapter config sha256 digest.' },
  { id: 'open-scaffold.dispatch-receipt.v1', owner: 'src/dispatch.ts + adapters', maturity: 'stable', emittedBy: ['osc dispatch adapters', '@open-scaffold/runtime-omx'], shape: 'Adapter receipt describing adapter id, run id, status, spawn boundary, evidence artifacts, and runtime metadata.' },
  { id: 'open-scaffold.pr_summary.v1', owner: 'src/pr-summary.ts', maturity: 'stable', emittedBy: ['osc pr-summary'], shape: 'Read-only plan summary for PR comments: plan path/stage, goal, acceptance criteria, evidence note, validation, and open questions.' },
  { id: 'open-scaffold.pr_check.v1', owner: 'src/pr-check.ts', maturity: 'stable', emittedBy: ['osc pr check'], shape: 'Structural PR work-record check with findings for plan/evidence/run/close-decision and explicit structural-only warning.' },
  { id: 'open-scaffold.trace.v1', owner: 'src/trace.ts', maturity: 'stable', emittedBy: ['osc trace --json'], shape: 'Local work-record replay for one plan with plan state, evidence/run/PR links, warnings, and structural summary.' },
  { id: 'open-scaffold.attempt-comparison.v1', owner: 'src/compare.ts', maturity: 'stable', emittedBy: ['osc compare --json'], shape: 'Read-only comparison of two attempt directories with file diffs and reviewable decision support.' },
  { id: 'open-scaffold.compact-evidence.v1', owner: 'src/compact-evidence.ts', maturity: 'stable', emittedBy: ['osc evidence compact'], shape: 'Compact evidence manifest and markdown summary for run/loop artifacts with raw/local payload omission and redaction boundaries.' },
  { id: 'open-scaffold.evidence.v1', owner: 'docs/SLICE_CLOSE_PROTOCOL.md', maturity: 'stable', emittedBy: ['evidence receipts and postflight notes'], shape: 'Evidence receipt with approval status, rationale, artifacts, verification, follow-up, and boundary statements.' },
  { id: 'open-scaffold.audit_manifest.v1', owner: 'src/audit.ts', maturity: 'lab', emittedBy: ['osc audit init'], shape: 'Digest-only artifact audit manifest for local structural review.' },
  { id: 'open-scaffold.evaluation.v1', owner: 'src/evaluation.ts', maturity: 'lab', emittedBy: ['osc eval init', 'osc eval import'], shape: 'Evaluation envelope with acceptance criteria, scorer output, import provenance, routing, and no-certification notes.' },
  { id: 'open-scaffold.evolution-loop.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve init'], shape: 'Loop directory state for objective, subject, strategy, created time, boundary flags, and stop conditions.' },
  { id: 'open-scaffold.evolution-attempt.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve record'], shape: 'Append-only attempt journal entries with run/evaluation/receipt/evidence refs, decision, score, and rationale.' },
  { id: 'open-scaffold.evolution-frontier.v1', owner: 'src/evolution.ts', maturity: 'lab', emittedBy: ['osc evolve record', 'osc evolve compare'], shape: 'Current frontier pointer for the promoted attempt plus decision metadata.' },
  { id: 'open-scaffold.audit-envelope.v1', owner: 'src/audit.ts', maturity: 'lab', emittedBy: ['osc audit init'], shape: 'Audit envelope/manifest record for artifact roles, digests, boundaries, and local-only integrity checks.' },
  { id: 'open-scaffold.runtime-profile.v1', owner: 'src/runtimes.ts', maturity: 'lab', emittedBy: ['.osc/runtime-profiles/*.json'], shape: 'Project-local runtime profile mapping a safe runtime id to lane, workflow defaults, and harness-skill hints without enabling spawning.' },
  { id: 'open-scaffold.work-dry-run.v1', owner: 'src/work.ts', maturity: 'lab', emittedBy: ['osc work --dry-run --json'], shape: 'Preview-only natural-language work composition: candidate plan, run preview, next commands, and no-write/no-spawn boundaries.' },
  { id: 'open-scaffold.cockpit_event.v1', owner: 'src/cockpit.ts', maturity: 'lab', emittedBy: ['osc cockpit post'], shape: 'Operator-surface event payload for status/blocker/question/approval/completion messages; not canonical state.' },
  { id: 'open-scaffold.web_dashboard.v1', owner: 'src/dashboard-web.ts', maturity: 'lab', emittedBy: ['osc dashboard --web'], shape: 'Static dashboard data snapshot derived from local scaffold state.' },
  { id: 'open-scaffold.plan-graph.v1', owner: 'src/plan-graph.ts', maturity: 'advanced', emittedBy: ['osc plan graph --format json'], shape: 'Graph of plan dependencies and upstream/downstream references across plan stages.' },
  { id: 'open-scaffold.study.v1', owner: 'src/study.ts', maturity: 'advanced', emittedBy: ['osc study --json'], shape: 'Repository study/report metrics with sources, trends, and caveats.' },
  { id: 'open-scaffold.resume.v1', owner: 'src/resume.ts / docs resume fixtures', maturity: 'future', emittedBy: ['resume proof fixtures'], shape: 'Zero-context resume packet shape used by committed fixtures and future resume command exploration.' },
];

export function schemaById(id: string): SchemaRegistryEntry | null {
  return SCHEMA_REGISTRY.find((entry) => entry.id === id) ?? null;
}

export function renderSchemaList(): string {
  return `${['Open Scaffold schema registry', '', ...SCHEMA_REGISTRY.map((entry) => `- ${entry.id} (${entry.maturity}) — owner: ${entry.owner}`), ''].join('\n')}`;
}

export function renderSchemaDetail(entry: SchemaRegistryEntry): string {
  return [
    `# ${entry.id}`,
    '',
    `Maturity: ${entry.maturity}`,
    `Owner: ${entry.owner}`,
    `Emitted by: ${entry.emittedBy.join(', ')}`,
    '',
    'Shape:',
    entry.shape,
    '',
    'Boundary: schema registration documents artifact shape and ownership only; it is not a correctness, compliance, or approval claim.',
    '',
  ].join('\n');
}
