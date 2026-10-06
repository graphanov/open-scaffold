import { describe, expect, it } from 'vitest';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const repoRoot = resolve(import.meta.dirname, '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

async function localPackageRegistry(tarball: string, manifestPath: string): Promise<{ process: ChildProcess; url: string }> {
  // npm needs a registry manifest to resolve a versioned npx command. Serve only
  // our packed artifact on loopback, then shut this registry down before resume.
  const registry = spawn(process.execPath, ['--input-type=module', '-e', `
    import { createServer } from 'node:http';
    import { readFileSync } from 'node:fs';
    import { createHash } from 'node:crypto';
    const tarball = readFileSync(process.argv[1]);
    const pkg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const server = createServer((request, response) => {
      if (request.url === '/open-scaffold') {
        const tarballUrl = 'http://127.0.0.1:' + server.address().port + '/package.tgz';
        const version = { ...pkg, dist: { tarball: tarballUrl, integrity: 'sha512-' + createHash('sha512').update(tarball).digest('base64') } };
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ name: pkg.name, 'dist-tags': { latest: pkg.version }, versions: { [pkg.version]: version } }));
      } else if (request.url === '/package.tgz') response.end(tarball);
      else { response.statusCode = 404; response.end(); }
    });
    server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
    process.on('disconnect', () => server.close());
  `, tarball, manifestPath], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const port = await new Promise<number>((resolvePort, reject) => {
    registry.once('message', (message) => resolvePort((message as { port: number }).port));
    registry.once('error', reject);
    registry.once('exit', (code) => reject(new Error(`Test package registry exited before startup: ${code}`)));
  });
  return { process: registry, url: `http://127.0.0.1:${port}` };
}

describe('npm-only newcomer handoff', () => {
  it('runs the packed CLI in two fresh sessions, preserves progress, and closes a verifiable chain', async () => {
    const work = mkdtempSync(join(tmpdir(), 'osc-newcomer-'));
    const project = join(work, 'project');
    const cache = join(work, 'npm-cache');
    const userconfig = join(work, 'npmrc');
    mkdirSync(project);
    writeFileSync(userconfig, '');
    const env = { ...process.env, npm_config_cache: cache, NPM_CONFIG_CACHE: cache, npm_config_userconfig: userconfig, NPM_CONFIG_USERCONFIG: userconfig };
    let registry: ChildProcess | undefined;
    const runNpm = (args: string[], cwd: string) => execFileSync(npm, args, {
      cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      ...(process.platform === 'win32' ? { shell: true } : {}),
    });
    try {
      // The normal pack lifecycle builds the artifact. The isolated loopback
      // registry installs that exact package through the normal transient npm path.
      const [pack] = JSON.parse(runNpm(['pack', '--json', '--pack-destination', work], repoRoot)) as Array<{ filename: string }>;
      const tarball = join(work, pack.filename);
      const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { version: string };
      const local = await localPackageRegistry(tarball, join(repoRoot, 'package.json'));
      registry = local.process;
      Object.assign(env, { npm_config_registry: local.url, NPM_CONFIG_REGISTRY: local.url });
      const osc = (args: string[]) => runNpm(['exec', '--yes', '--package', `open-scaffold@${pkg.version}`, '--', 'open-scaffold', ...args], project);
      const slug = 'first-record';
      const onboarding = osc(['first-run', '--non-interactive', '--slug', slug, '--mission', 'Retain useful evidence between sessions.', '--goal', 'Create a verifiable first local record.']);
      expect(onboarding).toContain(`npx open-scaffold@latest handoff --plan ${slug}`);
      expect(onboarding).not.toContain('https://github.com/graphanov/open-scaffold/blob/main/');
      expect(onboarding).toContain('npx runs the package without installing a global osc command');
      // Later sessions have only their previously populated npm cache. There is
      // no registry, global osc, project node_modules, or source runner available.
      registry.kill();
      registry = undefined;
      Object.assign(env, { npm_config_offline: 'true', NPM_CONFIG_OFFLINE: 'true' });
      expect(existsSync(join(project, 'node_modules'))).toBe(false);
      const planPath = join(project, `.osc/plans/active/${slug}.md`);
      const evidenceFile = readdirSync(join(project, '.osc/releases')).find((file) => file.endsWith(`-${slug}.md`))!;
      const evidencePath = join(project, '.osc/releases', evidenceFile);
      const evidenceRef = `.osc/releases/${evidenceFile}`;
      const validation = osc(['plan', 'validate', slug, '--strict']);
      const initial = readFileSync(planPath, 'utf8');
      writeFileSync(planPath, initial.replace('- [ ] Mission is defined without the `mission:unset` marker.', `- [x] Mission is defined without the \`mission:unset\` marker. | Evidence: ${evidenceRef}`));
      writeFileSync(evidencePath, readFileSync(evidencePath, 'utf8').replace('- Pending: replace this line with real command output before closing the plan.', `- Mission is defined. Plan validation exited 0:\n\n\`\`\`text\n${validation.trim()}\n\`\`\`\n\n- Next session: review the two remaining structural criteria before closure.`));
      // A different active task makes the explicit identity meaningful. Every
      // npm exec invocation starts a new CLI process with no chat memory.
      osc(['plan', 'new', 'other-task', '--stage', 'active']);
      const resumed = JSON.parse(osc(['handoff', '--plan', slug, '--json']));
      expect(resumed.mission.defined).toBe(true);
      expect(resumed.active_plan.slug).toBe(slug);
      expect(resumed.active_plan.goal).toBe('Create a verifiable first local record.');
      expect(resumed.active_plan.acceptance_criteria.map((criterion: { checked: boolean }) => criterion.checked)).toEqual([true, false, false]);
      expect(resumed.other_active_plans).toContain('other-task');
      expect(resumed.next_bounded_action).toBeTruthy();
      const suggested = resumed.next_commands[0];
      expect(suggested).toBe(`npx open-scaffold@${pkg.version} plan validate ${slug} --strict`);
      const [executable, ...suggestedArgs] = suggested.split(/\s+/);
      expect(executable).toBe('npx');
      const suggestedOutput = execFileSync(npx, suggestedArgs, {
        cwd: project, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        ...(process.platform === 'win32' ? { shell: true } : {}),
      });
      expect(suggestedOutput).toBe(validation);
      expect(osc(['trace', slug])).toContain(evidenceFile);

      const completed = readFileSync(planPath, 'utf8').replace(/^- \[ \] (.+)$/gm, `- [x] $1 | Evidence: ${evidenceRef}`);
      writeFileSync(planPath, completed);
      const review = readFileSync(evidencePath, 'utf8')
        .replace('approval.status: blocked', 'approval.status: approved')
        .replace('approval.rationale: First-run skeleton exists, but real work evidence has not been added yet.', 'approval.rationale: Mission, validation, evidence, and second-session handoff checked locally.');
      writeFileSync(evidencePath, review);
      osc(['close', slug, '--message', 'Verified local newcomer record and second-session handoff.']);
      const closedValidation = execFileSync(npx, [`open-scaffold@${pkg.version}`, 'plan', 'validate', slug, '--strict'], {
        cwd: project, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        ...(process.platform === 'win32' ? { shell: true } : {}),
      });
      expect(closedValidation).toBe(validation);
      expect(readFileSync(join(project, `.osc/plans/done/${slug}.md`), 'utf8')).toMatch(/## Status\s+done\b/);
      writeFileSync(evidencePath, readFileSync(evidencePath, 'utf8').replace(`.osc/plans/active/${slug}.md`, `.osc/plans/done/${slug}.md`));
      const chain = JSON.parse(osc(['verify', '--evidence-chain', '--plan', slug, '--strict', '--json']));
      expect(chain).toHaveLength(1);
      expect(chain[0].plan_slug).toBe(slug);
      expect(chain[0].links.every((link: { status: string }) => link.status === 'intact')).toBe(true);
      const closed = readFileSync(join(project, `.osc/plans/done/${slug}.md`), 'utf8');
      osc(['first-run', '--non-interactive', '--slug', slug, '--mission', 'Preserve this mission.', '--goal', 'Preserve prior intent.']);
      expect(existsSync(planPath)).toBe(false);
      expect(readFileSync(join(project, `.osc/plans/done/${slug}.md`), 'utf8')).toBe(closed);
    } finally {
      registry?.kill();
      rmSync(work, { recursive: true, force: true });
    }
  }, 90_000);
});
