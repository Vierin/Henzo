import { existsSync } from 'fs';
import { join, sep } from 'path';

export type HenzoBackendEnv = 'local' | 'staging' | 'production';

const ENV_ALIASES: Record<string, HenzoBackendEnv> = {
  local: 'local',
  dev: 'local',
  development: 'local',
  staging: 'staging',
  production: 'production',
  prod: 'production',
};

/** Explicit target from `HENZO_ENV` (local | staging | production). */
export function resolveHenzoBackendEnv(): HenzoBackendEnv | undefined {
  const raw = process.env.HENZO_ENV?.trim().toLowerCase();
  if (!raw) return undefined;
  return ENV_ALIASES[raw];
}

function resolveBackendRoot(entryDirname: string): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, 'apps', 'backend', 'package.json'))) {
    return join(cwd, 'apps', 'backend');
  }
  if (existsSync(join(cwd, 'prisma', 'schema.prisma'))) {
    return cwd;
  }
  const inDist = entryDirname.includes(`${sep}dist${sep}`);
  return inDist
    ? join(entryDirname, '..', '..')
    : join(entryDirname, '..');
}

/**
 * Picks backend env file:
 * - `HENZO_ENV=local|staging|production` → `.env.{name}` first
 * - else `.env.local` (local dev → staging Supabase)
 * - else legacy `.env`
 *
 * Never auto-loads `.env.staging` / `.env.production` without `HENZO_ENV`
 * (Docker Compose injects those via `env_file` into process env).
 */
export function resolveBackendEnvPath(
  entryDirname: string,
): string | undefined {
  const backendRoot = resolveBackendRoot(entryDirname);
  const explicit = resolveHenzoBackendEnv();
  const candidates: string[] = [];

  if (explicit) {
    candidates.push(join(backendRoot, `.env.${explicit}`));
  }

  candidates.push(
    join(backendRoot, '.env.local'),
    join(backendRoot, '.env'),
  );

  return candidates.find((p) => existsSync(p));
}

export function describeBackendEnvFile(envPath: string | undefined): string {
  if (!envPath) return 'process environment (no .env file)';
  const base = envPath.split(sep).pop() ?? envPath;
  const henzo = resolveHenzoBackendEnv();
  return henzo ? `${base} (HENZO_ENV=${henzo})` : base;
}
