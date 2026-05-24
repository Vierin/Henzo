#!/usr/bin/env node
/**
 * Load Henzo backend `.env.*` then run a command (Prisma, Nest, etc.).
 * Usage: node scripts/run-with-env.mjs <command> [args...]
 * Set HENZO_ENV=local|staging|production to force a specific file.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');

const ENV_ALIASES = {
  local: 'local',
  dev: 'local',
  development: 'local',
  staging: 'staging',
  production: 'production',
  prod: 'production',
};

function resolveEnvPath() {
  const raw = (process.env.HENZO_ENV ?? '').trim().toLowerCase();
  const slug = ENV_ALIASES[raw];
  const candidates = [];

  if (slug) {
    candidates.push(join(backendRoot, `.env.${slug}`));
  }
  candidates.push(
    join(backendRoot, '.env.local'),
    join(backendRoot, '.env'),
  );

  return candidates.find((p) => existsSync(p));
}

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
  if (process.env.HENZO_LOG_ENV !== '0') {
    console.log(`[henzo-env] ${envPath}`);
  }
} else {
  console.warn('[henzo-env] No .env file found; using process environment');
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('Usage: node scripts/run-with-env.mjs <command> [args...]');
  process.exit(1);
}

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
  cwd: backendRoot,
});

process.exit(result.status ?? 1);
