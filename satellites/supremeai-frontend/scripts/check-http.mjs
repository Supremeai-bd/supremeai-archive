#!/usr/bin/env node
/**
 * Ratchet for direct `fetch()` usage in the browser app.
 *
 * New network calls must go through `apiClient` (JSON `/api/**`) or
 * `src/utils/http.ts` (streaming, uploads, third-party APIs) so timeouts,
 * abort handling and error taxonomy stay consistent.
 *
 *   node scripts/check-http.mjs            # fail on new/increased raw fetch
 *   node scripts/check-http.mjs --update   # re-baseline after migrating
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'scripts', 'http-baseline.json');
const UPDATE = process.argv.includes('--update');

// Plumbing that owns `fetch` by definition.
const OWNERS = new Set([
  'src/services/apiClient.ts',
  'src/services/telemetry.ts',
  'src/utils/http.ts',
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
  }
  return files;
}

const current = {};
for (const file of walk(SRC)) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (OWNERS.has(relative)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const count = (source.match(/(?<![\w.])fetch\s*\(/g) ?? []).length;
  if (count > 0) current[relative] = count;
}

const total = Object.values(current).reduce((sum, n) => sum + n, 0);

if (UPDATE) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(
    `HTTP baseline written: ${total} raw fetch call(s) across ${Object.keys(current).length} files.`
  );
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('Missing scripts/http-baseline.json — run `npm run http:update` first.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const regressions = [];

for (const [file, count] of Object.entries(current)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) regressions.push(`${file}: ${count} (baseline ${allowed})`);
}

const baselineTotal = Object.values(baseline).reduce((sum, n) => sum + n, 0);
const migrated = baselineTotal - total;

if (regressions.length > 0) {
  console.error(`\n✗ ${regressions.length} file(s) added raw fetch calls:\n`);
  for (const line of regressions) console.error(`  ${line}`);
  console.error(
    '\nUse apiClient for JSON /api/** calls, or fetchJson/fetchWithTimeout from src/utils/http.ts.'
  );
  process.exit(1);
}

console.log(
  `✓ No new raw fetch calls (${total} remaining${migrated > 0 ? `, ${migrated} migrated` : ''}).`
);
if (migrated > 0) console.log('  Run `npm run http:update` to ratchet the baseline down.');
