# Live Data Fabric — Real-Data Auto-Sync Contract

> **Scope:** Cross-repo contract between `Supremeai-bd/supremeai` (FastAPI core + gateway) and
> `Supremeai-bd/supremeai-frontend` (Studio satellite).
>
> **Doctrine:** every dashboard, badge and KPI in the Studio reads from a real backend
> route on a declared cadence. No static fixtures are presented as live data, and no
> surface is allowed to block chat, voice or the workspace when its endpoint is down.

---

## 1. Why this layer exists

Before the fabric, the Studio had ~40 service modules that each fetched once on mount:

- dashboards froze at the moment of first paint (no cadence, no revalidation);
- a backend route missing from the Express edge fell through to the SPA fallback and
  returned `200 text/html`, which client services then tried to parse as JSON;
- every view invented its own retry/error policy, so a single 502 produced silent gaps;
- there was no single place to answer "is this feature actually wired to the backend?".

The Live Data Fabric replaces that with one registry, one scheduler and one truthful
console.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Studio UI                                                                │
│  ├─ SyncStatusPill (global chrome)   ← live pulse, click-through         │
│  ├─ /?tab=live-sync  FederationSyncView ← coverage matrix + inspector    │
│  └─ any feature view via useFederationSource(id)                         │
└─────────────────────────────▲────────────────────────────────────────────┘
                              │ zustand store (snapshots, pulse, events)
┌─────────────────────────────┴────────────────────────────────────────────┐
│ FederationSyncEngine (src/services/federationSyncService.ts)             │
│  scheduler · single-flight · ETag revalidation · backoff · cache · pause │
└─────────────────────────────▲────────────────────────────────────────────┘
                              │ same-origin fetch, auth headers preserved
┌─────────────────────────────┴────────────────────────────────────────────┐
│ Edge transport                                                           │
│  dev / preview : server.ts  (Express, unmatched /api/* → upstream)       │
│  production    : functions/api/[[path]].ts (Cloudflare Pages catch-all)  │
└─────────────────────────────▲────────────────────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────┴────────────────────────────────────────────┐
│ Supremeai-bd/supremeai                                                    │
│  core/api/**  ·  gateway/**  ·  infrastructure/mcp-control-plane          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Source registry (single source of truth)

`src/config/federationSources.ts` declares every synced surface. Adding a feature to the
Studio means adding one entry here — the console, the pill, the cache and the KPIs pick
it up automatically.

| Feature               | Endpoint                              | Origin         | Cadence | Auth    |
| --------------------- | ------------------------------------- | -------------- | ------- | ------- |
| Runtime Health        | `GET /api/v1/health`                  | core           | 12 s    | public  |
| Edge Runtime          | `GET /api/health`                     | edge           | 15 s    | public  |
| Liveness Probe        | `GET /api/v1/health/live`             | core           | 20 s    | public  |
| Platform Policy       | `GET /api/platform/config`            | core           | 60 s    | api key |
| System Status         | `GET /api/v1/status`                  | core           | 25 s    | session |
| Dashboard Telemetry   | `GET /api/v1/dashboard`               | core           | 30 s    | session |
| Model Catalogue       | `GET /api/models`                     | edge → gateway | 90 s    | public  |
| Gateway Latency       | `GET /api/v1/telemetry/latency`       | core           | 15 s    | api key |
| Route Arbiter         | `GET /api/v1/admin/router/live-state` | core           | 10 s    | api key |
| Provider Mesh         | `GET /api/health-aggregation`         | core           | 45 s    | public  |
| Ecosystem Health      | `GET /api/v1/ecosystem/health`        | core           | 30 s    | public  |
| Capability Registry   | `GET /api/v1/ecosystem/capabilities`  | core           | 90 s    | public  |
| Autonomous Tasks      | `GET /api/v1/ecosystem/tasks`         | core           | 25 s    | public  |
| Deployment Provenance | `GET /api/v1/ecosystem/deployments`   | core           | 90 s    | public  |
| Resource Registry     | `GET /api/v1/ecosystem/resources`     | core           | 90 s    | public  |
| MCP Manifest          | `GET /api/v1/ecosystem/mcp/manifest`  | core           | 120 s   | public  |
| Agent Registry        | `GET /api/v1/agents`                  | core           | 30 s    | public  |
| HITL Approvals        | `GET /api/v1/hitl/pending`            | core           | 15 s    | admin   |
| Skill Graph           | `GET /api/v1/graph/skills`            | core           | 120 s   | public  |
| Memory Fabric         | `GET /api/v1/memory/stats`            | core           | 30 s    | session |
| Auto-Evolution        | `GET /api/v1/evolution/status`        | core           | 60 s    | session |
| MCP Tower Cluster     | `GET /api/mcp-tower/services`         | edge           | 12 s    | public  |
| Conversation Archive  | `GET /api/v1/conversations`           | core           | 60 s    | session |

Paths are **same-origin and relative**. They never contain provider-specific model IDs
(`gemini-*`, `gpt-*`, `claude-*`) — the gateway's `DynamicRouteArbiter` keeps exclusive
control over provider selection, per `docs/API_POOL_AND_LATENCY_POLICY.md`.

---

## 3. Sync semantics

| Concern        | Behaviour                                                                             |
| -------------- | ------------------------------------------------------------------------------------- |
| Cadence        | Per-source `intervalMs`, multiplied by the console's 0.5× / 1× / 2× control.          |
| Jitter         | ±10 % on every success so a fleet of tabs never bursts at once.                       |
| First paint    | Cached snapshots hydrate synchronously from `localStorage` before any request.        |
| Revalidation   | `If-None-Match` with the previous `ETag`; `304` keeps the payload and costs nothing.  |
| Backoff        | `base × 2^failures`, capped at 300 s, ±15 % jitter. Resets to the cadence on success. |
| Single-flight  | A source can only have one in-flight request; concurrent callers share the promise.   |
| Visibility     | Timers stop when the tab is hidden and re-arm on focus (stale sources sync first).    |
| Offline        | `navigator.onLine === false` → `offline`; the `online` event re-arms every source.    |
| Payload safety | `text/html` (SPA fallback) is rejected as an error, never rendered as data.           |
| Cache budget   | 1.5 MB cap; heaviest payloads are down-graded to metadata instead of blowing quota.   |

### State vocabulary

| State         | Meaning                                                         | UI treatment                |
| ------------- | --------------------------------------------------------------- | --------------------------- |
| `ok`          | Fresh payload within the freshness budget.                      | Green · "Live"              |
| `stale`       | Payload exists but is older than `3 × cadence` (min 30 s).      | Amber · "Stale"             |
| `syncing`     | Request in flight.                                              | Blue · spinner              |
| `error`       | HTTP/borderline failure with the upstream's own message.        | Rose · "Error"              |
| `offline`     | Network or 502/503/504 upstream outage.                         | Slate · "Offline"           |
| `restricted`  | 401/403 or missing credential — expected for operator surfaces. | Indigo · "Sign-in required" |
| `unsupported` | 404/405/501 — the route is not mounted in this deployment.      | Slate · "Not mounted"       |
| `paused`      | Operator paused the source from the console.                    | Slate · "Paused"            |

Restricted and unsupported states are deliberately **not** counted as degraded: a guest
browsing the console should not see a wall of red because operator endpoints are gated.

---

## 4. Edge proxy contract

Both transports must guarantee one of:

1. a JSON body with an HTTP status that reflects reality, or
2. an explicit `5xx` JSON error (`{success:false, error, detail, retryable}`).

They must **never** answer an unmatched `/api/*` request with `200 text/html`.

- **Development / preview** — `server.ts` registers every implemented `/api/*` route
  first, then a terminal `/api` middleware forwards anything unmatched to
  `SUPREMEAI_BACKEND_URL` (default `https://supremeai-api-ulw0.onrender.com`). Auth
  headers (`authorization`, `x-supremeai-key`, `x-admin-token`, `cookie`) are preserved,
  SSE is streamed unbuffered, and network failures return `502` with `retryable: true`.
- **Production** — `functions/api/[[path]].ts` already forwards the full path verbatim to
  the same upstream, which is why every registry path starts with `/api/`.

Sandboxes without egress to the gateway will therefore show `Offline` rows with the real
proxy diagnosis instead of silently empty panels. Point `SUPREMEAI_BACKEND_URL` at a
reachable instance and the fabric reconnects on the next cadence tick.

---

## 5. Using live data in a feature

```tsx
import { useFederationSource } from '../hooks/useFederationSync';

export function AgentCountBadge() {
  const agents = useFederationSource('agents'); // snapshot with state + summary
  if (agents?.state !== 'ok') return null; // fail-open: no fake numbers
  return <span>{agents.summary.records} agents</span>;
}
```

For features that need freshness, staleness and a manual refresh control, use the
live hook instead of a bespoke poller:

```tsx
import { useFederationLive } from '../hooks/useFederationLive';

const { data, state, updatedAt, isFresh, refresh } =
  useFederationLive<MyPayload>('mcp-tower');
// state: 'idle' | 'syncing' | 'ok' | 'stale' | 'error' | 'offline' | 'restricted' | ...
// on mount the hook warms the source only when its snapshot is past 1.5x cadence
```

Programmatic access (services and stores — reads go straight to the engine):

```ts
import {
  getFederationData,
  isFederationFresh,
  ensureFederationFresh,
} from '../services/federationBridge';

const cached = getFederationData<PlatformConfig>('platform-config');
if (!cached) await ensureFederationFresh('platform-config'); // fail-open, never throws
const refreshed = getFederationData<PlatformConfig>('platform-config');
```

Rules of thumb:

- **Never** add a `setInterval` poll or a second `fetch` for a path that is already a
  federation source — subscribe to the snapshot instead.
- An explicit user action that must bypass the cache (post-reboot refresh, "Check now")
  calls `ensureFederationFresh(id, 0)` or `refreshSource(id)`.
- Keep the direct service call only as the fallback for when the source is
  `restricted`/`error` and the snapshot has no payload.

Current fabric consumers:

| Feature                     | Source id         | Consumer                                                    |
| --------------------------- | ----------------- | ----------------------------------------------------------- |
| HITL approval queue         | `hitl-pending`    | `src/hooks/useHitlApproval.ts` (SSE still pushes)           |
| MCP Tower mesh              | `mcp-tower`       | `useAdminStore.fetchMcpServices` → `adminService`           |
| Platform policy / flags     | `platform-config` | `usePlatformStore.fetchConfig` → `adminService`             |
| Sync console + sidebar pill | all               | `src/components/sync/FederationSyncView.tsx`, `Sidebar.tsx` |

Normalisation helpers live in `src/utils/federationNormalize.ts`
(`readPath`, `countRecords`, `summarizePayload`, formatters) and tolerate bare arrays,
bare objects and `{data|items|results|pending}` envelopes.

---

## 6. Verification checklist

```bash
npx tsc --noEmit                       # types
npm test                               # 204 unit tests (fabric + bridge)
npm run build                          # < 5 s production bundle
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/v1/ecosystem/health
#   → 200 JSON when the gateway is reachable
#   → 502 {"error":"Federation upstream unreachable","retryable":true} otherwise
```

The fabric test suite covers: registry integrity (unique ids, `/api/` only, no provider
model slugs, full domain coverage), record/metric extraction, conditional requests,
single-flight, backoff growth, credential gating, HTML fallback rejection, unmounted
endpoints, staleness, cache hydration, persistence and pulse aggregation.

---

## 7. Related documents

- `docs/API_POOL_AND_LATENCY_POLICY.md` — protected pool + latency routing invariants.
- `AGENTS.md` — local-first, cloud-optional operating doctrine.
- `README.md` — deployment topology and required environment variables.
