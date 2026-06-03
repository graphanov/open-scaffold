import {
  EVOLUTION_EFFICIENCY_REPORT_SCHEMA,
  buildEvolutionControllerSignal,
  renderEvolutionAnalysis,
  type EvolutionAnalysisFormat,
  type EvolutionAnalysisResult,
  type EvolutionControllerSignal,
} from './evolution.js';

function bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function roundRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(6));
}

function present(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function isNoOpRetryAttempt(attempt: EvolutionAnalysisResult['currentAttempt']): boolean {
  return attempt.decision === 'retry' && attempt.repairHypothesis?.actualDelta === 0;
}

export interface EvolutionEfficiencyModeMetrics {
  label: 'full' | 'compact';
  outputBytes: number;
  usefulDecisionFields: number;
  outputBytesPerUsefulDecisionField: number;
  evidenceBytesPerActionRecommendation: number;
  nextActionPacketBytes: number;
  requiredControlFieldsPresent: number;
  requiredControlFieldsTotal: number;
  requiredControlFieldRatio: number;
  requiredControlFieldsPerKb: number;
}

export interface EvolutionEfficiencyTarget {
  id: string;
  label: string;
  baselineBytes: number;
  compactBytes: number;
  reductionRatio: number;
  requiredFields: string[];
  requiredFieldsPreserved: boolean;
  achievedAtLeastOnePointFiveX: boolean;
  classification: 'strong' | 'marginal';
  publicSummaryCounted: boolean;
}

export interface EvolutionAnalysisEfficiencyReport {
  schema: typeof EVOLUTION_EFFICIENCY_REPORT_SCHEMA;
  scope: 'diagnostic';
  stability: 'experimental';
  loop: EvolutionAnalysisResult['loop'];
  definition: {
    primary: string;
    secondary: string;
  };
  baseline: EvolutionEfficiencyModeMetrics;
  compact: EvolutionEfficiencyModeMetrics;
  improvement: {
    outputByteReductionRatio: number;
    outputBytesPerUsefulDecisionFieldReductionRatio: number;
    compactUsesAtMostTwoThirdsBaselineBytes: boolean;
    requiredControlFieldsPreserved: boolean;
    renderedCompactControlFieldsPresent: number;
    renderedCompactControlFieldsTotal: number;
    renderedCompactControlFieldsPreserved: boolean;
    achievedAtLeastOnePointFiveX: boolean;
  };
  telemetry: EvolutionControllerSignal['usageReceipt']['completeness'];
  blindRetriesPrevented: number;
  analyzeToRecommendation: {
    stepCount: number;
    steps: string[];
  };
  targets: EvolutionEfficiencyTarget[];
  additionalTargetsAtLeastOnePointFiveX: number;
  publicSummaryTargetsAtLeastOnePointFiveX: number;
  marginalTargets: string[];
  warnings: string[];
  caveats: string[];
}

function requiredControlFieldChecks(signal: EvolutionControllerSignal): Array<{ field: string; present: boolean }> {
  return [
    { field: 'action', present: present(signal.action) },
    { field: 'summary', present: present(signal.summary) },
    { field: 'reasons', present: present(signal.reasons) },
    { field: 'resume.currentAttemptId', present: true },
    { field: 'resume.frontierAttemptId', present: true },
    { field: 'resume.currentEvaluation', present: true },
    { field: 'plateau.status', present: present(signal.plateau.status) },
    { field: 'plateau.noImprovementCount', present: present(signal.plateau.noImprovementCount) },
    { field: 'acceptance.currentPass', present: present(signal.acceptance.currentPass) },
    { field: 'acceptance.currentTotal', present: present(signal.acceptance.currentTotal) },
    { field: 'acceptance.remainingFailures', present: true },
    { field: 'requiredNextFields', present: present(signal.requiredNextFields) },
    { field: 'usageReceipt.completeness', present: present(signal.usageReceipt.completeness) },
    { field: 'evidenceRefs', present: true },
    { field: 'boundaryNotes', present: present(signal.boundaryNotes) },
  ];
}

function usefulDecisionFieldCount(signal: EvolutionControllerSignal): number {
  return requiredControlFieldChecks(signal).filter((field) => field.present).length;
}

function modeEfficiencyMetrics(label: 'full' | 'compact', output: string, signal: EvolutionControllerSignal): EvolutionEfficiencyModeMetrics {
  const outputBytes = bytes(output);
  const required = requiredControlFieldChecks(signal);
  const usefulFields = usefulDecisionFieldCount(signal);
  const evidenceBytes = bytes(signal.evidenceRefs.join('\n'));
  const nextActionPacketBytes = bytes(JSON.stringify(signal));
  const presentCount = required.filter((field) => field.present).length;
  const totalCount = required.length;
  return {
    label,
    outputBytes,
    usefulDecisionFields: usefulFields,
    outputBytesPerUsefulDecisionField: roundRatio(outputBytes / Math.max(1, usefulFields)),
    evidenceBytesPerActionRecommendation: evidenceBytes,
    nextActionPacketBytes,
    requiredControlFieldsPresent: presentCount,
    requiredControlFieldsTotal: totalCount,
    requiredControlFieldRatio: roundRatio(presentCount / totalCount),
    requiredControlFieldsPerKb: roundRatio(presentCount / Math.max(1, outputBytes / 1024)),
  };
}

function lineStartingWith(text: string, prefix: string): string {
  return text.split('\n').find((line) => line.startsWith(prefix)) ?? '';
}

function linesStartingWith(text: string, prefixes: string[]): string {
  return text
    .split('\n')
    .filter((line) => prefixes.some((prefix) => line.startsWith(prefix)))
    .join('\n');
}

function sectionFromHeading(text: string, heading: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return '';
  const rest = lines.slice(start + 1);
  const next = rest.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !line.startsWith(' ') && !line.startsWith('|') && !line.startsWith('- ') && !line.startsWith('>') && !trimmed.startsWith('`');
  });
  return [lines[start], ...(next >= 0 ? rest.slice(0, next) : rest)].join('\n').trim();
}

function markdownSection(text: string, heading: string): string {
  const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const match = text.match(pattern);
  if (!match || match.index === undefined) return '';
  const afterStart = match.index + match[0].length;
  const after = text.slice(afterStart);
  const next = after.search(/^##\s+/m);
  return `${match[0]}${next >= 0 ? after.slice(0, next) : after}`.trim();
}

function hasSignalPath(signal: EvolutionControllerSignal, path: string): boolean {
  switch (path) {
    case 'action':
      return present(signal.action);
    case 'summary':
      return present(signal.summary);
    case 'reasons':
      return present(signal.reasons);
    case 'resume.currentAttemptId':
      return Object.hasOwn(signal.resume, 'currentAttemptId');
    case 'resume.frontierAttemptId':
      return Object.hasOwn(signal.resume, 'frontierAttemptId');
    case 'resume.currentEvaluation':
      return Object.hasOwn(signal.resume, 'currentEvaluation');
    case 'plateau.status':
      return present(signal.plateau.status);
    case 'plateau.noImprovementCount':
      return present(signal.plateau.noImprovementCount);
    case 'acceptance.currentPass':
      return present(signal.acceptance.currentPass);
    case 'acceptance.currentTotal':
      return present(signal.acceptance.currentTotal);
    case 'acceptance.remainingFailures':
      return Object.hasOwn(signal.acceptance, 'remainingFailures');
    case 'acceptance.remainingFailureIds':
      return Object.hasOwn(signal.acceptance, 'remainingFailureIds');
    case 'requiredNextFields':
      return present(signal.requiredNextFields);
    case 'usageReceipt.completeness':
      return present(signal.usageReceipt.completeness);
    case 'evidenceRefs':
      return Object.hasOwn(signal, 'evidenceRefs');
    case 'boundaryNotes':
      return present(signal.boundaryNotes);
    default:
      return false;
  }
}

function includesAll(text: string, values: string[]): boolean {
  return values.every((value) => text.includes(value));
}

function displayed(value: string | null): string {
  return value ?? '—';
}

function snippetContainsField(snippet: string, field: string, signal: EvolutionControllerSignal): boolean {
  switch (field) {
    case 'action':
      return snippet.includes(signal.action);
    case 'summary':
      return snippet.includes(signal.summary);
    case 'reasons':
      return includesAll(snippet, signal.reasons);
    case 'resume.currentAttemptId':
      return snippet.includes(displayed(signal.resume.currentAttemptId)) || snippet.includes('"currentAttemptId"');
    case 'resume.frontierAttemptId':
      return snippet.includes(displayed(signal.resume.frontierAttemptId)) || snippet.includes('"frontierAttemptId"');
    case 'resume.currentEvaluation':
      return snippet.includes(displayed(signal.resume.currentEvaluation)) || snippet.includes('"currentEvaluation"');
    case 'plateau.status':
      return snippet.includes(signal.plateau.status);
    case 'plateau.noImprovementCount':
      return snippet.includes(String(signal.plateau.noImprovementCount)) || snippet.includes('"noImprovementCount"');
    case 'acceptance.currentPass':
      return snippet.includes(String(signal.acceptance.currentPass)) || snippet.includes('"currentPass"');
    case 'acceptance.currentTotal':
      return snippet.includes(String(signal.acceptance.currentTotal)) || snippet.includes('"currentTotal"');
    case 'acceptance.remainingFailures':
      return signal.acceptance.remainingFailureIds.length === 0
        ? snippet.includes('remaining=—') || snippet.includes('- —') || snippet.includes('[]')
        : includesAll(snippet, signal.acceptance.remainingFailureIds);
    case 'acceptance.remainingFailureIds':
      return signal.acceptance.remainingFailureIds.length === 0 ? snippet.includes('[]') : includesAll(snippet, signal.acceptance.remainingFailureIds);
    case 'requiredNextFields':
      return includesAll(snippet, signal.requiredNextFields);
    case 'usageReceipt.completeness':
      return snippet.includes(`completeness=${signal.usageReceipt.completeness.present}/${signal.usageReceipt.completeness.total}`)
        || snippet.includes(`completeness ${signal.usageReceipt.completeness.present}/${signal.usageReceipt.completeness.total}`)
        || snippet.includes('"completeness"');
    case 'evidenceRefs':
      return signal.evidenceRefs.length === 0 ? snippet.includes('Evidence refs: —') || snippet.includes('[]') : includesAll(snippet, signal.evidenceRefs);
    case 'boundaryNotes':
      return includesAll(snippet, signal.boundaryNotes);
    default:
      return false;
  }
}

function requiredRenderedControlFieldChecks(output: string, signal: EvolutionControllerSignal): Array<{ field: string; present: boolean }> {
  const remainingIds = signal.acceptance.remainingFailureIds;
  return [
    { field: 'action', present: output.includes(`Action: ${signal.action}`) },
    { field: 'summary', present: output.includes(signal.summary) },
    { field: 'reasons', present: includesAll(output, signal.reasons) },
    { field: 'resume.currentAttemptId', present: output.includes(`current=${displayed(signal.resume.currentAttemptId)}`) },
    { field: 'resume.frontierAttemptId', present: output.includes(`frontier=${displayed(signal.resume.frontierAttemptId)}`) },
    { field: 'resume.currentEvaluation', present: output.includes(`evaluation=${displayed(signal.resume.currentEvaluation)}`) },
    { field: 'plateau.status', present: output.includes(`Plateau: ${signal.plateau.status}`) },
    { field: 'plateau.noImprovementCount', present: output.includes(`no-improve=${signal.plateau.noImprovementCount}`) },
    { field: 'acceptance.currentPass', present: output.includes(`Acceptance: ${signal.acceptance.currentPass}/${signal.acceptance.currentTotal} pass`) },
    { field: 'acceptance.currentTotal', present: output.includes(`Acceptance: ${signal.acceptance.currentPass}/${signal.acceptance.currentTotal} pass`) },
    { field: 'acceptance.remainingFailures', present: remainingIds.length === 0 ? output.includes('remaining=—') : includesAll(output, remainingIds) },
    { field: 'requiredNextFields', present: includesAll(output, signal.requiredNextFields) },
    { field: 'usageReceipt.completeness', present: output.includes(`completeness=${signal.usageReceipt.completeness.present}/${signal.usageReceipt.completeness.total}`) },
    { field: 'evidenceRefs', present: signal.evidenceRefs.length === 0 ? output.includes('Evidence refs: —') : includesAll(output, signal.evidenceRefs) },
    { field: 'boundaryNotes', present: includesAll(output, signal.boundaryNotes) },
  ];
}

function classifyTarget(reductionRatio: number): 'strong' | 'marginal' {
  return reductionRatio >= 2 ? 'strong' : 'marginal';
}

function efficiencyTarget(id: string, label: string, baseline: string, compact: string, requiredFields: string[], signal: EvolutionControllerSignal): EvolutionEfficiencyTarget {
  const baselineBytes = bytes(baseline);
  const compactBytes = bytes(compact);
  const reductionRatio = roundRatio(baselineBytes / Math.max(1, compactBytes));
  const requiredFieldsPreserved = requiredFields.every((field) => hasSignalPath(signal, field) && snippetContainsField(compact, field, signal));
  const achievedAtLeastOnePointFiveX = reductionRatio >= 1.5 && requiredFieldsPreserved;
  const classification = classifyTarget(reductionRatio);
  return {
    id,
    label,
    baselineBytes,
    compactBytes,
    reductionRatio,
    requiredFields,
    requiredFieldsPreserved,
    achievedAtLeastOnePointFiveX,
    classification,
    publicSummaryCounted: achievedAtLeastOnePointFiveX && classification === 'strong',
  };
}

function measureAdditionalEfficiencyTargets(analysis: EvolutionAnalysisResult, signal: EvolutionControllerSignal): EvolutionEfficiencyTarget[] {
  const fullTerminal = renderEvolutionAnalysis(analysis, 'terminal', { compact: false });
  const compactTerminal = renderEvolutionAnalysis(analysis, 'terminal', { compact: true });
  const fullMarkdown = renderEvolutionAnalysis(analysis, 'markdown', { compact: false });
  const compactMarkdown = renderEvolutionAnalysis(analysis, 'markdown', { compact: true });
  const fullJson = renderEvolutionAnalysis(analysis, 'json', { compact: false });
  const compactJson = renderEvolutionAnalysis(analysis, 'json', { compact: true });
  const criteriaJson = JSON.stringify(analysis.criteria, null, 2);
  const remainingFailuresJson = JSON.stringify(signal.acceptance.remainingFailures, null, 2);
  const deltaJson = JSON.stringify({ currentVsPrevious: analysis.currentVsPrevious, currentVsFrontier: analysis.currentVsFrontier }, null, 2);
  const resumeJson = JSON.stringify(signal.resume, null, 2);

  return [
    efficiencyTarget('target.markdown.full_to_compact', 'Full markdown analysis -> compact markdown controller signal', fullMarkdown, compactMarkdown, ['action', 'summary', 'requiredNextFields', 'boundaryNotes'], signal),
    efficiencyTarget('target.json.full_to_controller_signal', 'Full JSON analysis -> controller-signal JSON', fullJson, compactJson, ['action', 'summary', 'resume.currentAttemptId', 'requiredNextFields', 'boundaryNotes'], signal),
    efficiencyTarget('target.terminal.control_section_to_usage_receipt', 'Terminal current-attempt control block -> compact usage receipt line', sectionFromHeading(fullTerminal, 'Current attempt control'), lineStartingWith(compactTerminal, 'Usage:'), ['usageReceipt.completeness'], signal),
    efficiencyTarget('target.terminal.sensitivity_to_acceptance', 'Terminal score-sensitivity table -> compact acceptance line', sectionFromHeading(fullTerminal, 'Score sensitivity'), lineStartingWith(compactTerminal, 'Acceptance:'), ['acceptance.currentPass', 'acceptance.currentTotal', 'acceptance.remainingFailures'], signal),
    efficiencyTarget('target.terminal.previous_delta_to_plateau', 'Terminal previous-delta table -> compact plateau line', sectionFromHeading(fullTerminal, 'Current vs previous AC delta'), lineStartingWith(compactTerminal, 'Plateau:'), ['plateau.status', 'plateau.noImprovementCount'], signal),
    efficiencyTarget('target.terminal.frontier_delta_to_resume', 'Terminal frontier-delta table -> compact resume/acceptance lines', sectionFromHeading(fullTerminal, 'Current vs frontier AC delta'), linesStartingWith(compactTerminal, ['Resume:', 'Acceptance:']), ['resume.currentAttemptId', 'resume.frontierAttemptId', 'acceptance.currentPass', 'acceptance.currentTotal'], signal),
    efficiencyTarget('target.terminal.packet_to_action_block', 'Terminal next-action packet block -> compact action/required/boundary lines', sectionFromHeading(fullTerminal, 'Next action packet'), linesStartingWith(compactTerminal, ['Action:', 'Required:', 'Boundary:']), ['action', 'requiredNextFields', 'boundaryNotes'], signal),
    efficiencyTarget('target.markdown.control_to_compact_bullets', 'Markdown plateau/control/recommendation sections -> compact action/plateau/usage bullets', [markdownSection(fullMarkdown, '## Plateau / stagnation'), markdownSection(fullMarkdown, '## Current attempt control'), markdownSection(fullMarkdown, '## Recommendation')].join('\n\n'), linesStartingWith(compactMarkdown, ['- Action:', '- Plateau:', '- Usage receipt:']), ['action', 'plateau.status', 'usageReceipt.completeness'], signal),
    efficiencyTarget('target.markdown.delta_tables_to_failures', 'Markdown AC delta tables -> compact remaining-failures section', [markdownSection(fullMarkdown, '## Current vs previous AC delta'), markdownSection(fullMarkdown, '## Current vs frontier AC delta')].join('\n\n'), markdownSection(compactMarkdown, '## Remaining failures'), ['acceptance.remainingFailures'], signal),
    efficiencyTarget('target.markdown.packet_sections_to_compact_required', 'Markdown packet/checklist/evidence/boundary sections -> compact required fields line', markdownSection(fullMarkdown, '## Next action packet'), compactMarkdown.split('\n').find((line) => line.startsWith('- Required next fields:')) ?? '', ['requiredNextFields'], signal),
    efficiencyTarget('target.json.criteria_to_remaining_failures', 'Full JSON criteria array -> remaining-failures JSON', criteriaJson, remainingFailuresJson, ['acceptance.remainingFailures'], signal),
    efficiencyTarget('target.json_deltas_to_resume', 'Full JSON AC deltas -> resume JSON', deltaJson, resumeJson, ['resume.currentAttemptId', 'resume.frontierAttemptId', 'resume.currentEvaluation'], signal),
  ];
}

function blindRetriesPreventedByRecommendation(analysis: EvolutionAnalysisResult): number {
  if (analysis.recommendation.action === 'continue') return 0;
  if (!isNoOpRetryAttempt(analysis.currentAttempt)) return 0;
  return analysis.nextActionPacket.acceptance.remainingFailures.length > 0 ? 1 : 0;
}

export function measureEvolutionAnalysisEfficiency(analysis: EvolutionAnalysisResult): EvolutionAnalysisEfficiencyReport {
  const signal = buildEvolutionControllerSignal(analysis);
  const fullOutput = renderEvolutionAnalysis(analysis, 'terminal', { compact: false });
  const compactOutput = renderEvolutionAnalysis(analysis, 'terminal', { compact: true });
  const baseline = modeEfficiencyMetrics('full', fullOutput, signal);
  const compact = modeEfficiencyMetrics('compact', compactOutput, signal);
  const targets = measureAdditionalEfficiencyTargets(analysis, signal);
  const outputByteReductionRatio = roundRatio(baseline.outputBytes / Math.max(1, compact.outputBytes));
  const bytesPerFieldReductionRatio = roundRatio(baseline.outputBytesPerUsefulDecisionField / Math.max(1, compact.outputBytesPerUsefulDecisionField));
  const requiredControlFieldsPreserved = compact.requiredControlFieldsPresent >= baseline.requiredControlFieldsPresent
    && compact.requiredControlFieldsTotal === baseline.requiredControlFieldsTotal;
  const renderedCompactChecks = requiredRenderedControlFieldChecks(compactOutput, signal);
  const renderedCompactControlFieldsPresent = renderedCompactChecks.filter((field) => field.present).length;
  const renderedCompactControlFieldsTotal = renderedCompactChecks.length;
  const renderedCompactControlFieldsPreserved = renderedCompactControlFieldsPresent === renderedCompactControlFieldsTotal;
  const compactUsesAtMostTwoThirdsBaselineBytes = compact.outputBytes <= baseline.outputBytes * (2 / 3);
  const warnings = [
    ...(compact.outputBytes > baseline.outputBytes * (2 / 3) ? ['Compact output is not yet <= 66.7% of baseline output bytes.'] : []),
    ...(signal.usageReceipt.completeness.missing.length > 0 ? [`Usage telemetry incomplete: missing ${signal.usageReceipt.completeness.missing.join(', ')}.`] : []),
    ...(analysis.nextActionPacket.evidenceRefs.length === 0 ? ['No safe evidence refs are present in the next-action packet.'] : []),
  ];
  return {
    schema: EVOLUTION_EFFICIENCY_REPORT_SCHEMA,
    scope: 'diagnostic',
    stability: 'experimental',
    loop: analysis.loop,
    definition: {
      primary: 'Same or better workflow-control decision fields with compact output using <= 66.7% of baseline analysis bytes.',
      secondary: 'At least 1.5x fewer output bytes per useful decision field while preserving required controller fields.',
    },
    baseline,
    compact,
    improvement: {
      outputByteReductionRatio,
      outputBytesPerUsefulDecisionFieldReductionRatio: bytesPerFieldReductionRatio,
      compactUsesAtMostTwoThirdsBaselineBytes,
      requiredControlFieldsPreserved,
      renderedCompactControlFieldsPresent,
      renderedCompactControlFieldsTotal,
      renderedCompactControlFieldsPreserved,
      achievedAtLeastOnePointFiveX: outputByteReductionRatio >= 1.5 && requiredControlFieldsPreserved && renderedCompactControlFieldsPreserved,
    },
    telemetry: signal.usageReceipt.completeness,
    blindRetriesPrevented: blindRetriesPreventedByRecommendation(analysis),
    analyzeToRecommendation: {
      stepCount: 4,
      steps: [
        'load loop/frontier/attempts',
        'read safe evaluation envelopes',
        'compute plateau/criteria deltas',
        'emit controller recommendation',
      ],
    },
    targets,
    additionalTargetsAtLeastOnePointFiveX: targets.filter((target) => target.achievedAtLeastOnePointFiveX).length,
    publicSummaryTargetsAtLeastOnePointFiveX: targets.filter((target) => target.publicSummaryCounted).length,
    marginalTargets: targets.filter((target) => target.achievedAtLeastOnePointFiveX && target.classification === 'marginal').map((target) => target.id),
    warnings,
    caveats: [
      'This efficiency report is diagnostic/experimental and should not be treated as a stable public proof surface.',
      'Efficiency here is controller-output overhead, not model intelligence, task correctness, productivity, or benchmark proof.',
      'Evidence bytes are safe reference bytes, not a score; evidence volume is not treated as quality.',
      'Token/cost telemetry completeness reports missing receipts instead of imputing costs.',
    ],
  };
}

export function renderEvolutionEfficiencyReport(report: EvolutionAnalysisEfficiencyReport, format: EvolutionAnalysisFormat = 'terminal'): string {
  if (format === 'json') return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    format === 'markdown' ? `# Evolution efficiency: ${report.loop.loopDir}` : `Evolution Efficiency: ${report.loop.loopDir}`,
    `Scope: ${report.scope}/${report.stability}`,
    '',
    `Primary definition: ${report.definition.primary}`,
    `Secondary definition: ${report.definition.secondary}`,
    '',
    '| Metric | Baseline | Compact |',
    '|---|---:|---:|',
    `| Output bytes | ${report.baseline.outputBytes} | ${report.compact.outputBytes} |`,
    `| Output bytes / useful decision field | ${report.baseline.outputBytesPerUsefulDecisionField} | ${report.compact.outputBytesPerUsefulDecisionField} |`,
    `| Evidence bytes / action recommendation | ${report.baseline.evidenceBytesPerActionRecommendation} | ${report.compact.evidenceBytesPerActionRecommendation} |`,
    `| Next-action packet bytes | ${report.baseline.nextActionPacketBytes} | ${report.compact.nextActionPacketBytes} |`,
    `| Required control fields present | ${report.baseline.requiredControlFieldsPresent}/${report.baseline.requiredControlFieldsTotal} | ${report.compact.requiredControlFieldsPresent}/${report.compact.requiredControlFieldsTotal} |`,
    `| Required control fields / KB | ${report.baseline.requiredControlFieldsPerKb} | ${report.compact.requiredControlFieldsPerKb} |`,
    '',
    `Output byte reduction ratio: ${report.improvement.outputByteReductionRatio}x`,
    `Bytes/useful-field reduction ratio: ${report.improvement.outputBytesPerUsefulDecisionFieldReductionRatio}x`,
    `Compact <= 66.7% baseline bytes: ${report.improvement.compactUsesAtMostTwoThirdsBaselineBytes ? 'yes' : 'no'}`,
    `Required fields preserved: ${report.improvement.requiredControlFieldsPreserved ? 'yes' : 'no'}`,
    `Rendered compact required fields preserved: ${report.improvement.renderedCompactControlFieldsPreserved ? 'yes' : 'no'} (${report.improvement.renderedCompactControlFieldsPresent}/${report.improvement.renderedCompactControlFieldsTotal})`,
    `Achieved >=1.5x measured output efficiency: ${report.improvement.achievedAtLeastOnePointFiveX ? 'yes' : 'no'}`,
    `Token/cost telemetry completeness: ${report.telemetry.present}/${report.telemetry.total}${report.telemetry.missing.length > 0 ? ` (missing ${report.telemetry.missing.join(', ')})` : ''}`,
    `Blind retries prevented in this fixture: ${report.blindRetriesPrevented}`,
    `Analyze input to actionable recommendation: ${report.analyzeToRecommendation.stepCount} step(s) (${report.analyzeToRecommendation.steps.join(' -> ')})`,
    `Additional diagnostic >=1.5x targets found: ${report.additionalTargetsAtLeastOnePointFiveX}/${report.targets.length}`,
    `Public-summary strong targets: ${report.publicSummaryTargetsAtLeastOnePointFiveX}/${report.targets.length}`,
    '',
    'Additional measured targets',
    '| Target | Baseline bytes | Compact bytes | Ratio | Preserved | Classification | Public-summary counted |',
    '|---|---:|---:|---:|---|---|---|',
    ...report.targets.map((target) => `| ${target.id} | ${target.baselineBytes} | ${target.compactBytes} | ${target.reductionRatio}x | ${target.requiredFieldsPreserved ? 'yes' : 'no'} | ${target.classification} | ${target.publicSummaryCounted ? 'yes' : 'no'} |`),
    '',
    'Marginal targets',
    ...(report.marginalTargets.length > 0 ? report.marginalTargets.map((target) => `- ${target}`) : ['- none']),
    '',
    'Warnings',
    ...(report.warnings.length > 0 ? report.warnings.map((warning) => `- ${warning}`) : ['- none']),
    '',
    'Caveats',
    ...report.caveats.map((caveat) => `- ${caveat}`),
  ];
  return `${lines.join('\n')}\n`;
}
