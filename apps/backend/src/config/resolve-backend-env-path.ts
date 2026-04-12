import { existsSync } from 'fs';
import { join, sep } from 'path';

/**
 * Backend `.env` when the process is started from repo root (Turbo), from
 * `apps/backend`, or via compiled `dist/src/*.js`. Avoids picking up a
 * root-level or frontend-only `.env` first.
 */
export function resolveBackendEnvPath(
  entryDirname: string,
): string | undefined {
  const inDist = entryDirname.includes(`${sep}dist${sep}`);
  const relativeToEntry = inDist
    ? join(entryDirname, '..', '..', '.env')
    : join(entryDirname, '..', '.env');

  const candidates = [
    join(process.cwd(), 'apps', 'backend', '.env'),
    join(process.cwd(), '.env'),
    relativeToEntry,
  ];

  return candidates.find((p) => existsSync(p));
}
