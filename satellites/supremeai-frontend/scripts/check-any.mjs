#!/usr/bin/env node
/**
 * Ratchet for explicit `any` in application code.
 *
 * `strict` is on, but `any` still opts out of it. The count may only go down:
 * every migration to `unknown` + a type guard lowers the baseline.
 *
 *   node scripts/check-any.mjs            # fail if the count grew
 *   node scripts/check-any.mjs --update   # lower the baseline after a cleanup
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'scripts', 'any-baseline.json');
const UPDATE = process.argv.includes('--update');

const PATTERN = /(?::\s*any\b)|(?:<any>)|(?:\bas\s+any\b)|(?:any\[\])/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) files.push(full);
  }
  return files;
}

const perFile = {};
let total = 0;
for (const file of walk(SRC)) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (relative.startsWith('src/types/')) continue; // third-party shims
  const matches = fs.readFileSync(file, 'utf8').match(PATTERN);
  if (matches?.length) {
    perFile[relative] = matches.length;
    total += matches.length;
  }
}

const previous = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).total
  : total;

if (UPDATE) {
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), total, perFile }, null, 2)}\n`
  );
  console.log(
    `any baseline written: ${total} occurrence(s) across ${Object.keys(perFile).length} files.`
  );
  process.exit(0);
}

if (total > previous) {
  console.error(`\n✗ explicit any grew: ${previous} → ${total}.`);
  const worst = Object.entries(perFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, count] of worst) console.error(`  ${count.toString().padStart(4)}  ${file}`);
  console.error('\nPrefer `unknown` + a type guard, or a narrow interface.');
  process.exit(1);
}

console.log(
  `✓ explicit any: ${total} (budget ${previous}${total < previous ? `, ${previous - total} removed` : ''}).`
);
if (total < previous) console.log('  Run `npm run any:update` to ratchet the budget down.');
