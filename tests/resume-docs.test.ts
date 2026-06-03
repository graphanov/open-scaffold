import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function exists(path: string): boolean {
  return existsSync(join(repoRoot, path));
}

function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n');
}

describe('resume docs self-checks (AC-6 through AC-10)', () => {
  describe('AC-6: START_HERE front door', () => {
    it('docs/START_HERE.md exists', () => {
      expect(exists('docs/START_HERE.md')).toBe(true);
    });

    it('README first 80 lines link to START_HERE.md', () => {
      const first80 = firstLines(read('README.md'), 80);
      expect(first80).toMatch(/START_HERE\.md/);
    });

    it('START_HERE.md contains the literal first command', () => {
      const content = read('docs/START_HERE.md');
      expect(content).toContain('npx open-scaffold init --tier min --target .');
    });
  });

  describe('AC-7: zero-context-resume narrative placement', () => {
    it('README first screen features resume narrative after the locked promise paragraph', () => {
      const readme = read('README.md');
      const lines = readme.split('\n');
      const first80 = lines.slice(0, 80).join('\n');

      expect(first80).toContain('It keeps the goal, plan, handoff, evidence, approval trail, and lessons');
      expect(first80).toMatch(/zero.context.resum|resume.*from.*repo|resume.*without.re.explain/i);

      const promiseIdx = lines.findIndex(l =>
        l.includes('It keeps the goal, plan, handoff, evidence, approval trail, and lessons'),
      );
      const resumeIdx = lines.findIndex(l =>
        /zero.context.resum|resume.*from.*repo|resume.*without.re.explain/i.test(l),
      );
      expect(promiseIdx).toBeGreaterThanOrEqual(0);
      expect(resumeIdx).toBeGreaterThan(promiseIdx);
      expect(resumeIdx).toBeLessThan(80);
    });

    it('README first 80 lines preserve all locked positioning tokens', () => {
      const first80 = firstLines(read('README.md'), 80);
      expect(first80).toContain('goal');
      expect(first80).toContain('plan');
      expect(first80).toContain('handoff');
      expect(first80).toContain('evidence');
      expect(first80).toContain('approval');
      expect(first80).toContain('lessons');
    });

    it('README first 80 lines avoid forbidden vocabulary', () => {
      const first80 = firstLines(read('README.md'), 80);
      expect(first80).not.toMatch(/agent OS|control plane|compliance-grade|operating system|tamper-proof/i);
    });

    it('README links to resume demo fixture', () => {
      const readme = read('README.md');
      expect(readme).toMatch(/examples\/resume-demo/);
    });

    it('README links to RESUME_WALKTHROUGH.md', () => {
      const readme = read('README.md');
      expect(readme).toMatch(/RESUME_WALKTHROUGH\.md/);
    });

    it('docs/index.html features zero-context-resume narrative', () => {
      const html = read('docs/index.html');
      expect(html).toMatch(/zero.context.resum|resume.*from.*repo|resume.*without.re.explain/i);
    });

    it('docs/RESUME_WALKTHROUGH.md exists', () => {
      expect(exists('docs/RESUME_WALKTHROUGH.md')).toBe(true);
    });

    it('walkthrough shows osc status and osc trace commands', () => {
      const walkthrough = read('docs/RESUME_WALKTHROUGH.md');
      expect(walkthrough).toContain('osc status');
      expect(walkthrough).toContain('osc trace');
    });

    it('walkthrough contains the no-overclaim disclaimer sentence', () => {
      const walkthrough = read('docs/RESUME_WALKTHROUGH.md');
      expect(walkthrough).toMatch(/reconstructed by.*tooling|reconstructed by.*test/i);
      expect(walkthrough).toMatch(/not.*emitted by.*stable command|not.*shipped.*stable command/i);
    });

    it('walkthrough next_bounded_action matches golden file when Task 1 fixture is ready', () => {
      const goldenPath = join(repoRoot, 'examples/resume-demo/expected-resume-summary.json');
      if (!existsSync(goldenPath)) {
        // Golden file not yet committed by Task 1; check deferred
        return;
      }
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as { next_bounded_action: string };
      const walkthrough = read('docs/RESUME_WALKTHROUGH.md');
      expect(walkthrough).toContain(golden.next_bounded_action);
    });
  });

  describe('AC-8: version truth reconciliation', () => {
    it('docs/VERSION_TRUTH.md exists', () => {
      expect(exists('docs/VERSION_TRUTH.md')).toBe(true);
    });

    it('README contains both v0.30.x current and v1.0.5 historical version tokens', () => {
      const readme = read('README.md');
      expect(readme).toMatch(/v0\.30\.x|v0\.30\.\d/);
      expect(readme).toMatch(/v1\.0\.5/);
    });

    it('STABILITY.md contains v0.30.x current line and v1.0.x historical reference', () => {
      const stability = read('docs/STABILITY.md');
      expect(stability).toMatch(/v0\.30\.x/);
      expect(stability).toMatch(/v1\.0\.[x5]/);
    });

    it('CHANGELOG.md contains v0.30.x entries and v1.0.5 historical entry', () => {
      const changelog = read('docs/CHANGELOG.md');
      expect(changelog).toMatch(/v0\.30\.\d/);
      expect(changelog).toMatch(/v1\.0\.5/);
    });
  });

  describe('AC-9: glossary term coverage', () => {
    it('docs/GLOSSARY.md exists', () => {
      expect(exists('docs/GLOSSARY.md')).toBe(true);
    });

    it('GLOSSARY defines run packet', () => {
      expect(read('docs/GLOSSARY.md')).toMatch(/run packet/i);
    });

    it('GLOSSARY defines glass cockpit', () => {
      expect(read('docs/GLOSSARY.md')).toMatch(/glass cockpit/i);
    });

    it('GLOSSARY defines OMC, OMX, and Codex', () => {
      const glossary = read('docs/GLOSSARY.md');
      expect(glossary).toMatch(/\bOMC\b/);
      expect(glossary).toMatch(/\bOMX\b/);
      expect(glossary).toMatch(/\bCodex\b/);
    });

    it('GLOSSARY defines operator surface', () => {
      expect(read('docs/GLOSSARY.md')).toMatch(/operator surface/i);
    });

    it('GLOSSARY defines .osc, .omc, .omx, .osc-dev directories', () => {
      const glossary = read('docs/GLOSSARY.md');
      expect(glossary).toContain('.osc');
      expect(glossary).toContain('.omc');
      expect(glossary).toContain('.omx');
      expect(glossary).toContain('.osc-dev');
    });

    it('GLOSSARY contains a core-vs-adapter boundary statement', () => {
      const glossary = read('docs/GLOSSARY.md');
      expect(glossary).toMatch(/core.*adapter|adapter.*core/i);
    });
  });

  describe('AC-10: CLI-absence guard', () => {
    it('src/cli.ts dispatch does not register resume or next subcommands', () => {
      const cli = read('src/cli.ts');
      expect(cli).not.toMatch(/case ['"]resume['"]/);
      expect(cli).not.toMatch(/case ['"]next['"]/);
    });

    it('docs/STABILITY.md stable-command-list block does not contain resume', () => {
      const stability = read('docs/STABILITY.md');
      const cliSection = stability.split('### CLI and shell floor')[1]?.split('###')[0] ?? '';
      expect(cliSection).not.toMatch(/\bresume\b/i);
    });

    it('osc --help does not list resume or next as subcommands', () => {
      let helpOutput = '';
      try {
        helpOutput = execSync('node dist/cli.js --help', {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string };
        helpOutput = err.stdout ?? err.stderr ?? '';
      }
      const resumeLines = helpOutput.split('\n').filter(l => /^\s*osc\s+(resume|next)\b/.test(l));
      expect(resumeLines).toHaveLength(0);
    });
  });
});
