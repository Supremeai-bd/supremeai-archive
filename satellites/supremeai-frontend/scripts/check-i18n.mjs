#!/usr/bin/env node
/**
 * Guards the bilingual contract in AGENTS.md §3: user-visible copy must come
 * from `src/locales/en.ts` / `bn.ts` via `useI18n().t`, not from literals in
 * components.
 *
 * Usage:
 *   node scripts/check-i18n.mjs            # fail on strings not in the baseline
 *   node scripts/check-i18n.mjs --update   # rewrite the baseline (after fixing)
 *
 * The baseline is a ratchet: existing debt is recorded once, and any *new*
 * hardcoded string fails CI. Shrink the baseline as views are migrated.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'i18n-baseline.json');
const UPDATE = process.argv.includes('--update');

const TEXT_NODE = />\s*([A-Za-z][A-Za-z0-9 ,.'’!?&:/()%+-]{2,})\s*</g;
const ATTRIBUTE = /\b(placeholder|title|aria-label|alt)\s*=\s*"([A-Za-z][^"]{2,})"/g;

/** Copy that is deliberately language-neutral. */
const ALLOWED = new Set([
  'SupremeAI',
  'SupremeAI Studio',
  'SupremeAI Core',
  'SupremeAI Reason',
  'SupremeAI Deep',
  'SupremeAI Web',
  'SupremeAI API',
  'Supreme Spark',
  'Supreme Core',
  'Supreme Reason',
  'Supreme Deep',
  'EN',
  'BN',
  'OK',
  'API',
  'MCP',
  'HITL',
  'TOTP',
  'JSON',
  'SSE',
  'ETag',
  'CSV',
  'PDF',
  'SDK',
  'GPT',
  'HTTP',
  'HTTPS',
  'URL',
  'URI',
  'YAML',
  'MIT',
  'Pro',
  'Free',
  'Enterprise',
  'Developer',
  'Admin',
  'User',
  'Guest',
  'Live',
  'Promise',
  // Infisical environment identifiers, not copy.
  'dev',
  'staging',
  'prod',
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) files.push(full);
  }
  return files;
}

function collect() {
  const findings = {};
  for (const file of walk(SRC)) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    const source = fs.readFileSync(file, 'utf8');
    const hits = new Set();

    for (const match of source.matchAll(TEXT_NODE)) {
      const text = match[1].trim().replace(/\s+/g, ' ');
      if (text.length < 3 || ALLOWED.has(text)) continue;
      if (!/[A-Za-z]{2}/.test(text)) continue;
      hits.add(text);
    }

    for (const match of source.matchAll(ATTRIBUTE)) {
      const text = match[2].trim().replace(/\s+/g, ' ');
      if (text.length < 3 || ALLOWED.has(text)) continue;
      // Placeholder examples that are URLs or repo slugs are code, not copy.
      if (
        match[1] === 'placeholder' &&
        (/^https?:\/\//.test(text) || /^[\w.-]+\/[\w.-]+$/.test(text))
      ) {
        continue;
      }
      hits.add(`${match[1]}="${text}"`);
    }

    if (hits.size > 0) findings[relative] = [...hits].sort();
  }
  return findings;
}

const current = collect();
const currentCount = Object.values(current).reduce((total, list) => total + list.length, 0);

if (UPDATE) {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(
    `Baseline written: ${currentCount} literals across ${Object.keys(current).length} files.`
  );
  process.exit(0);
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.error('Missing scripts/i18n-baseline.json — run `npm run i18n:update` first.');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const added = [];

for (const [file, literals] of Object.entries(current)) {
  const known = new Set(baseline[file] ?? []);
  for (const literal of literals) {
    if (!known.has(literal)) added.push({ file, literal });
  }
}

const baselineCount = Object.values(baseline).reduce((total, list) => total + list.length, 0);

if (added.length > 0) {
  console.error(
    `\n✗ ${added.length} new hardcoded UI string(s) — add a key to src/locales/en.ts + bn.ts and use t.<key>:\n`
  );
  for (const { file, literal } of added) console.error(`  ${file}\n    "${literal}"`);
  console.error(
    '\nIf a string is intentionally language-neutral, add it to ALLOWED in scripts/check-i18n.mjs.'
  );
  process.exit(1);
}

const removed = baselineCount - currentCount;
console.log(
  `✓ No new hardcoded UI strings (baseline ${baselineCount}${removed > 0 ? `, migrated ${removed}` : ''}).`
);
if (removed > 0) {
  console.log('  Run `npm run i18n:update` to ratchet the baseline down.');
}
