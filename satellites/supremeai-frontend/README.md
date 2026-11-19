# SupremeAI Studio

Bilingual (English / বাংলা) AI workspace console for the **SupremeAI** platform:
chat with native model routing, live voice, a browser-grade project workspace,
an admin control centre and a real-data sync fabric.

React 19 · Vite 8 · TypeScript 7 · Tailwind CSS 4 · Zustand 5 · Cloudflare Pages

---

## Quick start

```bash
nvm use                 # Node 24 (pinned in .nvmrc; engines >=22)
npm ci                  # reproducible install
cp .env.example .env    # optional: point at a local backend
npm run dev             # Express edge + Vite middleware on :3000
```

Open http://localhost:3000.

> The Express edge (`server.ts`) imports Vite, so `npm run dev` / `npm start`
> need dev dependencies. Production is static `dist/` + `functions/`, which
> installs and builds fine with `npm ci --omit=dev`.

| Script                                                | What it does                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev` / `npm start`                           | Express edge (`server.ts`) with Vite middleware — full `/api` surface locally |
| `npm run build`                                       | Production bundle into `dist/`                                                |
| `npm run preview`                                     | Preview the built bundle                                                      |
| `npm test`                                            | Vitest suite (unit + service layer)                                           |
| `npm run lint`                                        | `tsc --noEmit` (strict unused checks are on)                                  |
| `npm run lint:eslint` / `lint:all`                    | ESLint 10 (flat config) alone / tsc + ESLint together                         |
| `npm run format` / `format:check`                     | Prettier write / verify                                                       |
| `npm run i18n:check` / `i18n:update`                  | Block new hardcoded UI strings / ratchet the baseline down                    |
| `npm run http:check` / `http:update`                  | Block new raw `fetch()` call sites / ratchet after migrating                  |
| `npm run any:check` / `any:update`                    | Budget for explicit `any` (currently 83)                                      |
| `npm run e2e` / `e2e:install`                         | Playwright smoke suite (`e2e/`, chromium) / install the browser               |
| `npm run audit:prod`                                  | Fails on high/critical vulnerabilities in production deps                     |
| `npm run smoke -- https://supremeai-studio.pages.dev` | Post-deploy endpoint contract check                                           |

## Architecture

```
src/                    browser app (React 19, feature views, zustand stores)
  config/               env, feature flags, federation source registry
  services/             API client, auth, chat, workspace, federation engine
  components/           shell, chat, workspace, admin, settings, sync
  utils/i18n.ts         typed en/bn dictionary + useI18n()
  data/                 fixtures that views may fall back to offline
functions/              Cloudflare Pages Functions (production /api surface)
server.ts               Express edge used for local dev/preview (same routes)
public/_headers         production security headers
docs/                   sync contract, API pool policy, improvement audit
```

Two runtimes serve the same `/api` contract: `server.ts` for local development
and `functions/**` on Cloudflare. Any new endpoint should be added to both, or
to neither.

## Live data fabric

Every console view is fed from the real backend through one sync engine:

- **Registry** — `src/config/federationSources.ts` (23 endpoints across runtime
  pulse, gateway, ecosystem, agents, memory, infrastructure, workspace).
- **Engine** — `src/services/federationSyncService.ts`: per-source cadence,
  jitter, exponential backoff, ETag revalidation, single-flight, local snapshot
  cache and visibility-aware timers.
- **Console** — sidebar → **Live Data Fabric**, or the sync pill in the header:
  coverage matrix, payload inspector, latency sparklines, activity stream and an
  exportable diagnostic bundle.
- **Consumers** — feature code reads snapshots through `useFederationLive` /
  `src/services/federationBridge.ts` instead of running its own pollers (HITL queue,
  MCP Tower mesh, platform policy, plus the console itself).
- **Edge proxy** — unmatched `/api/*` is forwarded to `SUPREMEAI_BACKEND_URL`
  with auth headers preserved; it always answers JSON or an explicit 5xx, never
  `200 text/html`.

Contract, state vocabulary and runbook: [`docs/LIVE_DATA_SYNC.md`](docs/LIVE_DATA_SYNC.md).

## Configuration

| Variable                | Purpose                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | Edge/API origin (defaults to same origin)                                    |
| `VITE_GATEWAY_URL`      | Gateway base path for `/v1` routes                                           |
| `VITE_MCP_TOWER_URL`    | MCP Tower origin                                                             |
| `VITE_SUPABASE_URL`     | Optional Supabase project                                                    |
| `VITE_USE_MOCK`         | `false` in production — never ship fixtures as live data                     |
| `SUPREMEAI_BACKEND_URL` | Server-side proxy target (default `https://supremeai-api-ulw0.onrender.com`) |
| `VITE_ADMIN_EMAIL(S)`   | Comma-separated allow-list for admin elevation                               |

## Deployment

- **Frontend:** Cloudflare Pages → `supremeai-studio.pages.dev`, built by
  `.github/workflows/deploy.yml` on pushes to `main`.
- **PR gate:** `.github/workflows/ci.yml` runs `npm ci`, production audit,
  typecheck, tests and the production build.
- **Edge proxy:** `/api/*` → `SUPREMEAI_BACKEND_URL`.
- **Post-deploy:** `node scripts/smoke-live.mjs https://supremeai-studio.pages.dev`
  (fails on 5xx, missing routes, SPA HTML on API paths or invalid JSON).

## Observability

`src/utils/logger.ts` is the only logging front door; `logger.error` also
forwards to `src/services/telemetry.ts`, which POSTs to
`/api/telemetry/client-error` (Express edge and Pages Functions both
implement it). Reports are capped at 10 per message per minute, sent with
`keepalive`, and never retried — the endpoint is a sink, not a queue.

`installGlobalErrorHandlers()` is called from `src/main.tsx`, so uncaught
errors and rejected promises are reported even outside React.

## Conventions

Engineering rules — model slugs, bilingual UI requirements, latency-routing
policy, commit conventions and test/build budgets — live in
[`AGENTS.md`](AGENTS.md). The current prioritized improvement backlog (in Bangla)
is [`docs/IMPROVEMENT_AUDIT_BN.md`](docs/IMPROVEMENT_AUDIT_BN.md).

## License

MIT — see [`LICENSE`](LICENSE).
