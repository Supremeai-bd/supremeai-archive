#!/usr/bin/env node
/**
 * Post-deploy smoke check for the SupremeAI frontend edge.
 *
 * Usage:
 *   node scripts/smoke-live.mjs [base-url] [--strict]
 *
 * Default base URL: https://supremeai-studio.pages.dev
 *
 * Failure = network error, 5xx, an HTML body on an /api path (the SPA
 * fallback), or an unparseable JSON body. 4xx responses are reported as
 * warnings because several endpoints need a session token; pass --strict to
 * make warnings fail the run as well.
 *
 * Keep this list aligned with src/config/federationSources.ts — it is the
 * contract the console renders in the coverage matrix.
 */

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const base = (
  args.find((a) => !a.startsWith('--')) || 'https://supremeai-studio.pages.dev'
).replace(/\/+$/, '');
const strict = flags.has('--strict');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 12000);

const ENDPOINTS = [
  { path: '/api/health', name: 'edge health' },
  { path: '/api/models', name: 'model catalogue' },
  { path: '/api/platform/config', name: 'platform config' },
  { path: '/api/mcp-tower/services', name: 'mcp tower services' },
  { path: '/api/mcp-tower/streams', name: 'mcp tower streams' },
  { path: '/api/v1/hitl/pending', name: 'hitl queue' },
  { path: '/api/v1/stream/hitl', name: 'hitl stream', sse: true },
  { path: '/api/v1/capabilities/execute', name: 'capabilities', method: 'OPTIONS' },
  { path: '/api/v1/ecosystem/health', name: 'ecosystem health' },
  { path: '/api/v1/connections/detect', name: 'connection detection', method: 'OPTIONS' },
  { path: '/api/config/public', name: 'public config' },
  { path: '/api/v1/memory/stats', name: 'memory stats' },
  { path: '/api/v1/stream/chat', name: 'chat SSE handshake', method: 'OPTIONS' },
];

const failures = [];
const warnings = [];

async function check({ path, name, sse = false, method = 'GET' }) {
  const url = `${base}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: sse ? { Accept: 'text/event-stream' } : { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';
    const isApi = path.startsWith('/api/');
    const looksHtml = contentType.includes('text/html');

    if (res.status >= 500) {
      failures.push(`${res.status} ${path} (${name})`);
    } else if (res.status === 404) {
      failures.push(`404 ${path} (${name}) — route missing at the edge`);
    } else if (isApi && looksHtml) {
      failures.push(`${res.status} ${path} (${name}) — returned the SPA HTML fallback`);
    } else if (res.status >= 400) {
      warnings.push(`${res.status} ${path} (${name}) — needs auth or upstream disabled`);
    }

    if (!sse && res.ok && !looksHtml && contentType.includes('application/json')) {
      const body = await res.text();
      try {
        JSON.parse(body);
      } catch {
        failures.push(`${res.status} ${path} (${name}) — body is not valid JSON`);
      }
    }

    if (sse && res.ok && !contentType.includes('text/event-stream')) {
      warnings.push(
        `${res.status} ${path} (${name}) — expected text/event-stream, got "${contentType || 'none'}"`
      );
    }

    console.log(`${String(res.status).padEnd(4)} ${path}  ${name}`);
  } catch (error) {
    const reason =
      error?.name === 'AbortError'
        ? `timeout after ${timeoutMs}ms`
        : error?.message || String(error);
    failures.push(`ERR  ${path} (${name}) — ${reason}`);
    console.log(`ERR  ${path}  ${name} — ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

console.log(`Smoke checking ${base} (${ENDPOINTS.length} endpoints, timeout ${timeoutMs}ms)\n`);

// Bounded concurrency so we do not trip upstream rate limits.
const CONCURRENCY = 4;
for (let i = 0; i < ENDPOINTS.length; i += CONCURRENCY) {
  await Promise.all(ENDPOINTS.slice(i, i + CONCURRENCY).map(check));
}

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length) {
  console.log(`\n✗ ${failures.length} failure(s):`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

if (strict && warnings.length) {
  console.log('\n✗ strict mode: warnings are treated as failures');
  process.exit(1);
}

console.log(`\n✓ all ${ENDPOINTS.length} endpoints responded correctly`);
