#!/usr/bin/env node
/**
 * Regenerate email-icon-data.ts from PNG assets in frontend public.
 * Run: node scripts/generate-email-icon-data.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const iconsDir = join(backendRoot, '..', 'frontend', 'public', 'images', 'email');
const names = [
  'lock',
  'shield',
  'clock',
  'people',
  'link',
  'copy',
  'instagram',
  'facebook',
];

const lines = [
  '// Auto-generated outline email icons as base64 PNG. Regenerate after SVG changes.',
  '// node scripts/generate-email-icon-data.mjs',
  '',
  'export const EMAIL_ICON_DATA: Record<string, string> = {',
];

for (const name of names) {
  const pngPath = join(iconsDir, `icon-${name}.png`);
  const base64 = readFileSync(pngPath).toString('base64');
  lines.push(`  ${name}: ${JSON.stringify(base64)},`);
}

lines.push('};', '');

writeFileSync(
  join(backendRoot, 'src', 'email', 'templates', 'email-icon-data.ts'),
  `${lines.join('\n')}\n`,
);

console.log(`Generated ${names.length} icons -> src/email/templates/email-icon-data.ts`);
