import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Version of the running open-scaffold package, read from its own manifest.
 * Falls back to `0.0.0` when the manifest cannot be read.
 */
export function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [join(here, '..', 'package.json'), join(process.cwd(), 'package.json')];
    for (const path of candidates) {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as { version?: string };
      if (parsed.version) return parsed.version;
    }
  } catch {}
  return '0.0.0';
}
