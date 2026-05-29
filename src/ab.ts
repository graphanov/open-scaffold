import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Structural validator for an A/B comparison pilot packet
// (docs/examples/ab-comparison). It is strictly read-only: it parses the
// pre-registration and raw-data files, reports whether they are well-formed,
// and never writes, scores, interprets, or imputes anything. A passing check
// means "the instrument is well-formed", not "the experiment was run".

export const AB_RAW_DATA_REQUIRED_COLUMNS = ['task_id', 'arm', 'metric', 'value', 'source'] as const;
export const AB_ALLOWED_ARMS = ['A', 'B'] as const;
// Superset of the osc study source enum: adds `manual` for figures coded by
// hand under the rubric, which osc study cannot produce.
export const AB_ALLOWED_SOURCES = ['git', 'osc-artifact', 'metrics', 'manual', 'unavailable'] as const;
export const AB_PREREG_REQUIRED_SECTIONS = ['Hypotheses', 'Arms', 'Metrics', 'Analysis plan', 'Attestation'] as const;
export const AB_PREREG_ATTESTATION_PHRASE = 'before any data';
export const AB_PREREG_FILENAME = 'pre-registration.md';

export interface AbCheckIssue {
  file: string;
  line: number; // 1-based; 0 means file-level
  message: string;
}

export interface AbCheckReport {
  ok: boolean;
  preRegistration: string | null;
  rawData: string | null;
  issues: AbCheckIssue[];
}

function label(path: string, root: string): string {
  const rel = relative(root, path);
  return rel && !rel.startsWith('..') ? rel : path;
}

function checkPreRegistration(path: string, file: string, issues: AbCheckIssue[]): void {
  const text = readFileSync(path, 'utf8');
  const headings = text.split(/\r?\n/).filter((line) => /^#{1,6}\s/.test(line.trim()));
  for (const section of AB_PREREG_REQUIRED_SECTIONS) {
    const found = headings.some((heading) => heading.toLowerCase().includes(section.toLowerCase()));
    if (!found) {
      issues.push({ file, line: 0, message: `Pre-registration is missing a "${section}" heading.` });
    }
  }
  if (!text.toLowerCase().includes(AB_PREREG_ATTESTATION_PHRASE)) {
    issues.push({
      file,
      line: 0,
      message: `Pre-registration is missing the commit-before-data attestation (expected the phrase "${AB_PREREG_ATTESTATION_PHRASE}").`,
    });
  }
}

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function checkRawData(path: string, file: string, issues: AbCheckIssue[]): void {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim() !== '');
  if (headerIndex < 0) {
    issues.push({ file, line: 0, message: 'Raw-data file is empty (expected a header row).' });
    return;
  }

  const header = splitCsvLine(lines[headerIndex]);
  const columnIndex = new Map<string, number>();
  header.forEach((name, index) => {
    if (!columnIndex.has(name)) columnIndex.set(name, index);
  });

  const missing = AB_RAW_DATA_REQUIRED_COLUMNS.filter((column) => !columnIndex.has(column));
  for (const column of missing) {
    issues.push({ file, line: headerIndex + 1, message: `Raw-data file is missing required column: ${column}.` });
  }
  // Without the required columns the row coordinates are meaningless, so stop.
  if (missing.length > 0) return;

  const armCol = columnIndex.get('arm')!;
  const sourceCol = columnIndex.get('source')!;
  const valueCol = columnIndex.get('value')!;

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.trim() === '') continue;
    const cells = splitCsvLine(raw);
    const lineNumber = i + 1;
    const arm = (cells[armCol] ?? '').trim();
    const source = (cells[sourceCol] ?? '').trim();
    const value = (cells[valueCol] ?? '').trim();

    if (!(AB_ALLOWED_ARMS as readonly string[]).includes(arm)) {
      issues.push({ file, line: lineNumber, message: `Invalid arm "${arm}" (expected one of: ${AB_ALLOWED_ARMS.join(', ')}).` });
    }

    if (!(AB_ALLOWED_SOURCES as readonly string[]).includes(source)) {
      issues.push({ file, line: lineNumber, message: `Invalid source "${source}" (expected one of: ${AB_ALLOWED_SOURCES.join(', ')}).` });
      continue;
    }

    // Honesty rule: unavailable means no value; any other source means a real number.
    if (source === 'unavailable') {
      if (value !== '') {
        issues.push({ file, line: lineNumber, message: 'Value is present but source is "unavailable"; clear the value or label its real source.' });
      }
    } else if (value === '') {
      issues.push({ file, line: lineNumber, message: `Value is blank but source is "${source}"; use source "unavailable" for an unmeasured figure.` });
    } else if (!Number.isFinite(Number(value))) {
      issues.push({ file, line: lineNumber, message: `Value "${value}" is not numeric.` });
    }
  }
}

function findRawDataFile(dir: string): string | null {
  const csvFiles = readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.csv'));
  if (csvFiles.length === 0) return null;
  const preferred = ['raw-data-template.csv', 'raw-data.csv'];
  for (const name of preferred) {
    if (csvFiles.includes(name)) return join(dir, name);
  }
  return join(dir, csvFiles.sort()[0]);
}

export function checkAbPacket(targetPath: string, root: string = process.cwd()): AbCheckReport {
  const issues: AbCheckIssue[] = [];
  let preRegistration: string | null = null;
  let rawData: string | null = null;

  if (!existsSync(targetPath)) {
    issues.push({ file: label(targetPath, root), line: 0, message: 'Path does not exist.' });
    return { ok: false, preRegistration, rawData, issues };
  }

  const stats = statSync(targetPath);
  if (stats.isDirectory()) {
    const preRegPath = join(targetPath, AB_PREREG_FILENAME);
    if (existsSync(preRegPath)) {
      preRegistration = label(preRegPath, root);
      checkPreRegistration(preRegPath, preRegistration, issues);
    } else {
      issues.push({ file: label(targetPath, root), line: 0, message: `Missing pre-registration file: ${AB_PREREG_FILENAME}.` });
    }
    const rawDataPath = findRawDataFile(targetPath);
    if (rawDataPath) {
      rawData = label(rawDataPath, root);
      checkRawData(rawDataPath, rawData, issues);
    } else {
      issues.push({ file: label(targetPath, root), line: 0, message: 'No raw-data .csv file found in the packet directory.' });
    }
  } else if (targetPath.toLowerCase().endsWith('.csv')) {
    rawData = label(targetPath, root);
    checkRawData(targetPath, rawData, issues);
  } else if (targetPath.toLowerCase().endsWith('.md')) {
    preRegistration = label(targetPath, root);
    checkPreRegistration(targetPath, preRegistration, issues);
  } else {
    issues.push({ file: label(targetPath, root), line: 0, message: 'Unsupported target; expected a packet directory, a .md pre-registration, or a .csv raw-data file.' });
  }

  return { ok: issues.length === 0, preRegistration, rawData, issues };
}

export function formatAbCheckReport(report: AbCheckReport): string {
  const checked = [report.preRegistration, report.rawData].filter((path): path is string => Boolean(path));
  if (report.ok) {
    const what = checked.length > 0 ? checked.join(', ') : 'packet';
    return `A/B pilot packet is well-formed: ${what}.\nThis confirms the instrument is structurally valid — not that any experiment was run or that the scaffold improves any outcome.`;
  }
  const lines = [`A/B pilot packet is not well-formed (${report.issues.length} issue(s)):`];
  for (const issue of report.issues) {
    const where = issue.line > 0 ? `${issue.file}:${issue.line}` : issue.file;
    lines.push(`  - ${where}: ${issue.message}`);
  }
  return lines.join('\n');
}
