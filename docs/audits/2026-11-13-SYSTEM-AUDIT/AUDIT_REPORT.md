# SupremeAI Full System Audit Report

**Repository:** `Supremeai-bd/supremeai` (supremeai-main snapshot)
**Audit date:** 2026-11-13
**Scope:** Full monorepo — deepest attention on `core/` and `gateway/` per request; lighter pass on `studio/`, `browser/`, `vscode/`, `infrastructure/`, `.github/workflows/`
**Audit goals:** Security, Robustness, Lightweight & Speed, Zero-Cost Operation, Self-Healing / Self-Evolution
**Method:** 3,895 Python files compiled; AST + regex security scan (331 raw hits triaged); repo-wide import resolution (21,651 imports checked); content-hash duplication analysis; manual review of every security-critical path (auth, keygen, CI, vault, sandboxing); deployment wiring (render.yaml, Dockerfiles) traced end-to-end; live test collection.

> **How to read this report:** Section 2 answers "what works / what doesn't". Section 3 is the finding register (F-001…F-030) with evidence. Section 4 covers duplicates and overlapping logic (your special request). Section 5 maps your five goals to reality. Section 6 is the improvement roadmap (R-1…R-12). Patches: `patches/0001-0007` (all pre-verified with `git apply --check`), safe fixes also pre-applied in `patched/`.

---

## 1. Executive Summary

SupremeAI is an unusually ambitious 101 MB / ~5,600-file monorepo combining a 278k-LOC Python agent engine, a genuinely well-engineered thin API gateway, a full vendored fork of Open WebUI, a VS Code extension suite, a 35k-LOC TypeScript MCP control plane, and ~242k LOC of operational scripts — all deployed on free-tier infrastructure (Render, Cloudflare, Upstash, Supabase, Neon).

**Overall grade: B− (solid engineering core, undermined by one leaked credential, secret-exposure in CI, and systemic weight/duplication).**

The single most important facts:

1. **A live production admin API key is committed in a public doc** (F-001). Rotate it today. This is the only finding that costs money the moment someone reads your repo.
2. **Your CI hands live LLM provider keys to PR-authored code on your personal machine** (F-002). A collaborator's compromised account becomes your compromised keys. Patch included.
3. **The code quality of the security-critical paths is genuinely good** — fail-closed auth, constant-time HMAC key verification, SSRF-hardened proxies, redaction pipelines, AST sandbox scanning. This is far above typical hobby-project standards. The risk is concentrated in credentials and process, not in code.
4. **The biggest structural threat to your stated goals is weight and duplication, not bugs**: 49 MB of vendored Open WebUI, ~200 files of satellite-era mirror residue in `scripts/ops/`, two parallel gateway implementations, and ~50 heavyweight AI/ML imports (torch, litellm, opentelemetry…) that are not in any requirements file — so most of the "self-evolving intelligence" silently no-ops in production (F-003/F-005). The system *presents* as self-evolving but *runs* a small subset of itself.
5. **Zero-cost architecture is real and thoughtful** (free-tier orchestrator, budget guardians, cost guards) but leans on two fragile legs: Google/duck.ai cookie-jack relay (ToS/ban risk, F-011) and Render spin-down circumvention (F-012).

**Corrected during audit (transparency note):** an early read suggested workflow `branches: ain]` typos; byte-level verification proved all four workflow files actually contain the correct `branches: [main]` — that finding is **retracted** (it was an output-rendering artifact, re-verified with `ord()`-level checks). Every remaining finding in this report was verified at byte level.

---

## 2. Component Verdicts — What Works, What Doesn't

| # | Component | Size | Verdict | One-line reason |
|---|---|---|---|---|
| 1 | `gateway/service/` (deployed API) | ~8k LOC, 3 runtime deps | **WORKING** | Live on Render (`supremeai-api-ulw0`), fail-closed auth, HMAC-signed keys, provider failover pool |
| 2 | `gateway/main.py` + contracts | ~1.7k LOC | **WORKING (parallel)** | Clean, injectable, fully tested OpenAPI-contract implementation — but NOT the deployed one (overlap, see F-014) |
| 3 | `core/` app + API | 278k LOC, 28 deps | **PARTIAL** | Boots and serves, but ~50 undeclared-import intelligence paths silently degrade (F-003/F-005); not in render.yaml deployment set |
| 4 | `core/pyerrorfix/` | standalone tool | **WORKING** | Self-contained static error-fixer catalog with detectors/fixers + CLI; not wired to runtime (by design) |
| 5 | `core/self_evolution/` + `health/` | ~18k LOC | **PARTIAL** | Real engines (evolution, fitness, breeder, healer with HITL `pending_review`) wired into lifespan, but several paths dep-starved or env-gated OFF by default |
| 6 | `studio/` | 49 MB | **WORKING (fork)** | Open WebUI v0.13.0 fork — runs, but 132k vendored LOC, 103 pinned deps, upstream security fixes need manual re-sync (F-009) |
| 7 | `browser/` | 800 KB | **PARTIAL** | "Gemini cookie relay" live path works; `tools/` + `routes/` dead-import from `core/` (broken standalone); ghost_tower = ToS liability (F-011) |
| 8 | `vscode/extension/` | 1.1k LOC | **WORKING** | Real MCP bridge, tests, CSP'd webview, SecretStorage; desktop/mobile are scaffolds |
| 9 | `infrastructure/mcp-control-plane/` | 35k LOC TS + 87 test files | **WORKING** | Complete policy/tenancy/federation tower; one broken file `cloudflare/index.js` (F-008) |
| 10 | `.github/workflows/` | 5 files, 3.8k lines | **WORKING but UNSAFE** | Gates pass and deploy chain fires on push-to-main (verified byte-level); self-hosted runner + auto-merge design is exploitable (F-002) |
| 11 | `tests/` (root + core + gateway) | 945 test files | **PARTIAL** | Gateway: 1,191 tests collect, 29 modules error on missing test deps (F-010); CI never installs the real requirements files |

---

## 3. Finding Register (verified)

Severity: **CRITICAL** = act today · **HIGH** = act this week · **MED** = plan this month · **LOW** = hygiene.

### Security

**F-001 · CRITICAL · Live admin API key committed in docs**
`docs/SUPREMEAI_UNIFIED_CHAT_PIPELINE_SSOT.md` lines 176 & 184 contain the full-format key `sk-supreme-studio-admin.unlimited.<64-hex>-<64-hex>` (byte-verified, 2 occurrences) next to the production endpoint `https://supremeai-api-ulw0.onrender.com/v1`. The format matches `gateway/service/keygen.py` output exactly (client=`studio-admin`, quota=`unlimited`, full HMAC signature) — this is not a placeholder. Anyone with repo read access gets unlimited admin-quota inference on your provider pool.
→ **Patch 0001** redacts it. **Manual rotation is mandatory** (rotate `SUPREMEAI_MASTER_KEY` in Infisical — stateless HMAC design means one rotation invalidates all keys — or reissue; purge git history if the repo was public; audit usage logs).

**F-002 · HIGH · Self-hosted runner executes PR code with live secrets + review-free auto-merge**
`.github/workflows/unified-pipeline.yml` `render-heavy-gate` (lines 219–297) runs on `[self-hosted, local-pc]` (your personal Windows machine) for `pull_request` events, checks out the **PR head** with persisted credentials, and runs PR-controlled pytest/scripts with `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `MCP_TOWER_AUTH_TOKEN`, `GH_TOKEN` in env (lines 262–267, 286–288). Same-repo PR restriction excludes forks, but any collaborator (or a hijacked collaborator account) can exfiltrate every secret and execute arbitrary code on your PC. Compounding it, `auto-merge` (lines 424–504) squash-merges to `main` with `SELF_HEAL_PAT`/`SYNC_PAT` purely on CI status — and that status is produced by the PR's **own authored tests**.
→ **Patch 0002**: base-ref verifier checkout (`_verifier-base`, mirroring the already-safe fast-gate pattern), `persist-credentials: false`, tower token restricted to trusted events, auto-merge routed through a protected `production` environment (one-time Settings → Environments setup, fail-closed until then). Rotate the exposed keys afterward.

**F-003 · MED · Unguarded imports of undeclared packages kill the background-intelligence chain**
`core/telemetry/__init__.py` line 3 hard-imports `opentelemetry`, which is **not** in `core/requirements.txt` (28 entries). `core/startup/agents.py:151` imports `core.telemetry.system_telemetry` → executes the broken `__init__` first → ImportError → swallowed by lifespan's "degraded mode" handler. Result: in any environment built from requirements.txt, system telemetry (and any import that follows it in the chain) silently never starts. Same pattern: `core/models/error_remediation.py:5` (tenacity, unguarded, imported by `autonoguard_engine` + `gap_finder`).
→ **Patch 0003** (guard + NoOp fallback, consistent with `core/observability/telemetry.py`'s existing `OTEL_AVAILABLE` pattern) + **Patch 0004** (declare `tenacity`, `opentelemetry-sdk` — both tiny and pure-Python).

**F-004 · MED · CI installs an ad-hoc dependency list, never the real one**
All four `pip install` steps in `unified-pipeline.yml` (lines 112, 234, 354, 395) install `ruff pytest pytest-asyncio pydantic pydantic-settings python-dotenv fastapi httpx pyyaml sqlalchemy redis pyjwt` — a hand-typed list. `core/requirements.txt` (28 packages incl. sentry-sdk, supabase, asyncpg, infisical-python) is **never installed anywhere in CI**, so the production dependency set is untested, and CI green ≠ prod boots. → Roadmap R-3.

**F-005 · MED · ~50 heavyweight optional imports with no extras manifest**
litellm (9 sites), torch, google.cloud/firestore (8), stripe, firebase_admin, easyocr, whisper, cv2, docker, celery, posthog, mem0, e2b, browser_use, pydantic_ai, rookiepy, curl_cffi… None declared for `core/`. Lazy/guarded in most cases (checked individually), but there is no `requirements-ai.txt` / extras group declaring the "full intelligence" install, so nobody can reproduce a fully-capable environment. → Roadmap R-4.

**F-006 · LOW · Non-constant-time static key comparison in gateway**
`gateway/service/app.py` `_verify_client_auth`: `token in valid_keys` (set scan, short-circuits on first byte). The signed-key path already uses `hmac.compare_digest`. → **Patch 0005**.

**F-007 · INFO · Statelessly-signed keys cannot be individually revoked**
By design (`keygen.py`), any key remains valid until the master secret rotates. Acceptable trade-off for zero-DB verification, but combine with short quotas and log-based anomaly detection; a per-key revocation list in Upstash Redis would close the gap without cost.

**F-008 · Verified-safe items (negative findings, documented to avoid re-scare)**
- `core/ecosystem/users.py`, `connection_registry.py`, `adaptive_engine/*` SQL "f-strings" — parameterized values, f-strings interpolate class-constant table names only. **Not injectable.**
- `core/services/tool_forge.py` `exec()` — fail-closed behind `SUPREMEAI_ALLOW_INPROCESS_CODEGEN` (unset in prod), AST pre-scan, dunder-escape rejection. Documented as not-a-sandbox but gated.
- `core/health/self_healer.py` `eval(` hits — string literals inside the dangerous-keyword blocklist.
- `browser/server.py` webhook auth — fail-closed in prod via explicit RENDER env detection, `hmac.compare_digest`.
- Studio JWT `verify_signature=False` sites — upstream Open WebUI patterns; token-exchange one is provider-validated + domain-allowlisted first (MED-LOW, R-8), the other two are spec-compliant (back-channel logout does full JWKS verification after the unverified peek).
- No live credentials in `.env.example`, workflows, or mcp-control-plane (only gitleaks test fixtures and docs example strings).

### Robustness

**F-009 · HIGH · studio/ is an untracked 49 MB upstream fork**
`studio/package.json` = `open-webui@0.13.0`; backend is 100% upstream (zero SupremeAI markers in `backend/open_webui`; all customization is ~23 frontend files under `src/lib/supremeai/` + 5 route pages ≈ 2.7k LOC). The 0.13.0 changelog itself flags security fixes — you must manually re-sync 132k LOC to get them. License note: Open WebUI's license protects its branding; the "Sovereign Models / zero external branding" rebrand deserves a legal read. → Roadmap R-1 (overlay strategy).

**F-010 · MED · Gateway test suite cannot fully collect in a fresh environment**
29 of ~90 gateway test modules error at collection (missing sqlalchemy/stripe/etc. — none declared for the gateway; no `gateway/requirements-test.txt` exists). 1,191 tests do collect once sqlalchemy is present. → Roadmap R-3.

**F-011 · HIGH (legal/operational) · browser/ ghost_tower & cookie-relay design**
The "zero-cost" inference tier drives gemini.google.com with stored consumer session cookies, rotates Webshare proxies, and spoofs fingerprints (`runtime/stealth_profile.py`, `tools/browser_stealth.py`, `multi_ai_sso_runner.py`, Fernet `credential_vault.py` storing passwords + TOTP seeds). This is near-certain Google ToS violation, ban-risk, and a single-Infisical-compromise away from account takeover of the linked Google accounts. Also: `browser/tools/browser_stealth.py:14` imports `core.config` — modules that don't exist under `browser/`, so those trees are dead standalone. → Roadmap R-2.

**F-012 · MED · Free-tier keep-warm circumvention**
`infrastructure/cloudflare-render-keepwarm` (99 LOC cron pinging 6 Render services every 5 min) fights Render's free-tier spin-down. Functionally working; ToS-adjacent; also masks real cold-start metrics. Decide consciously.

**F-013 · LOW · Deployed gateway vs contract gateway drift**
The Docker CMD runs `gateway.service.app:app` (dynamic key-pool, 6 providers) while `gateway/main.py` implements `api-schemas/gateway.openapi.yaml` with injectable tests. Two auth systems, two rate limiters, two route surfaces coexist in `gateway/`. → Roadmap R-6 (pick one SSOT).

### Duplication & overlap

**F-014 · MED · gateway/routes/ is a satellite-era parity mirror** — `gateway/routes/__init__.py` does `from core.api.routes import *`; the whole 200-file/844 KB tree is only importable when `core/` is on the path (tests do this via conftest sys.path). The deployed gateway image does not ship `core/`, so this tree is deployment-dead weight.
**F-015 · MED · scripts/ops/ partial stale mirror** — 29 files across 6 subdirs duplicate `scripts/<same>/` with drift (e.g. `datetime.now(timezone.utc)` vs `datetime.UTC`), 6 of them referenced nowhere.
**F-016 · LOW · Exact duplicate file pairs** (whitespace-normalized hash): `core/api/routes/admin_dashboard/__init__.py` ⇔ `gateway/routes/admin_dashboard/__init__.py` (515 lines); same for `commandcenter/__init__.py` (180 lines); `scripts/audit/system_deep_scan.py` ⇔ `scripts/ops/audit/system_deep_scan_2026_09_15.py`; `browser/runtime/__init__.py` ⇔ ghost_tower copy; `skills/registry/__init__.py` ⇔ `gateway/skills/registry/__init__.py`.
**F-017 · INFO · Symbol-level duplication (by design, mostly)** — `self_test` (73 non-test definition sites), `upgrade`/`downgrade` (105 — alembic migrations), `_utcnow` (18), `Finding` (17), `AnomalyDetector` (8), `get_firestore_client` (8), `_require_admin` (7). The alembic pair is idiomatic; `_utcnow`/`get_firestore_client`/`_require_admin` should be one shared util each.
**F-018 · INFO · Module-name collisions** — 16 `models.py`, 14 `main.py`, 7 each of `config.py`/`security.py`/`web_scraper.py` (7 copies!), 5 `browser_agent.py`, 4 `admin_auth.py`, 4 `living_engine.py`. Collision cost is real in a monorepo with sys.path manipulation (which this repo does in at least 3 places).

---

## 4. Duplicate / Overlapping Logic — Full List

| # | Duplicate set | Evidence | Fix shipped |
|---|---|---|---|
| D-1 | `scripts/ops/{testing,backup,devops,tenant,monitoring,audit}/*` ⇔ `scripts/<same>/*` | 29 files, drifted content, satellite-era residue | **Patch 0006** deletes the 6 zero-reference copies; runbook R-5 for the rest (they appear in CI baselines) |
| D-2 | `gateway/routes/**` ⇔ `core/api/routes/**` | 200 files/844 KB re-export mirror; only alive under test sys.path shims | Documented; recommend removal after F-013 decision (R-6) |
| D-3 | `admin_dashboard/__init__.py` + `commandcenter/__init__.py` exact copies | 515 + 180 lines byte-identical between core and gateway trees | Covered by D-2 decision; exact-dupes called out for priority |
| D-4 | `scripts/audit/system_deep_scan.py` ⇔ `scripts/ops/audit/system_deep_scan_2026_09_15.py` | Whitespace-normalized identical, 9.6k chars | Dated snapshot; referenced only in bandit baseline — delete with R-5 |
| D-5 | `browser/runtime/__init__.py` ⇔ `browser/ghost_tower/stealth_browser_engine/__init__.py` | Exact copy | Resolved by R-2 (ghost_tower isolation) |
| D-6 | `skills/registry/__init__.py` ⇔ `gateway/skills/registry/__init__.py` | Exact copy (483 chars) | Trivial; fold into R-5 |
| D-7 | `_utcnow` / `_now_iso` (25 sites), `get_firestore_client` (8), `_require_admin` (7), `is_test_file` (9), `run_cmd` (11) | AST top-level symbol census | R-7: create `core/utils/time.py`, `core/utils/firestore.py`, shared admin dep — mechanical, low-risk |
| D-8 | `gateway/main.py` (contract impl) ⇔ `gateway/service/app.py` (deployed impl) | Two full gateway stacks incl. auth + rate limiting | R-6: declare `gateway/service/app.py` the SSOT (it's what runs) and retire or freeze `main.py` stack |
| D-9 | 7 × `web_scraper.py` across `skills/dynamic/`, `core/tools/`, browser trees | Module census | Consolidate on one scraper engine (R-7) |
| D-10 | CI `pip install` ad-hoc list ⇔ `core/requirements.txt` ⇔ studio 103-dep lockfile | Three dependency universes | R-3: one manifest per deployable + `-test` variants |

---

## 5. Goal-by-Goal Verdict

### 5.1 Secure — **B, one A-blocking credential incident**
Strengths: fail-closed production auth in gateway and browser; HMAC-signed stateless keys with full 64-hex MACs (legacy 48-bit tags explicitly rejected); SSRF-hardened render proxy with DNS-pinning; PII/secret redaction pipelines in gateway + control plane; AST sandbox scanner gating dynamic codegen; least-privilege workflow permissions; no wildcard CORS (fail-closed origins); timing-safe comparisons (after Patch 0005).
Gaps: F-001 leaked key (fixed by Patch 0001), F-002 runner/auto-merge (patched by 0002), F-003/4 dep hygiene, individual-key revocation (F-007).

### 5.2 Robust — **B−**
3,894/3,895 files compile. Error handling is pervasive. Provider failover chains, circuit breakers, retry budgets, idempotency middleware, health contracts and canary verification all exist and are wired.

### 5.3 Lightweight & High-Performing — **C+ (gateway: A; everything else drags it down)**
The deployed gateway is a model citizen: 3 runtime deps (fastapi, uvicorn, httpx), ~8k LOC, container pulls in seconds, cold-start friendly.

### 5.4 Zero-Cost / Maintainable Without Cost — **B (working), with two fragile legs**
Real and wired: `core/zero_cost_architecture/` orchestrator, cost guard, budget-guardian HALT in the orchestrator tick loop, free-tier monitor scripts, Upstash-Redis-backed queue/rate limits.

### 5.5 Self-Fixing & Self-Evolving — **C+ (real machinery, partially starved)**
Real machinery: agent supervisor with exponential-backoff restarts, auto-healer monitoring loop, `self_healer.propose_fix()` with human-in-the-loop `pending_review`, `SelfUpdater.apply_hotfix()` with path confinement + `.bak` backups.

---

## 6. Improvement Roadmap

| # | Action | Effort | Unblocks |
|---|---|---|---|
| R-1 | **Convert studio to an upstream-tracking overlay**: retired to supremeai-archive. | DONE | F-009, weight |
| R-2 | **Isolate or decommission ghost_tower + cookie relay**; replace with legitimate free tiers. | M | F-011, D-5 |
| R-3 | **One dependency universe**: CI installs `-r core/requirements.txt -r gateway/requirements.txt`. | S | F-004, F-010 |
| R-4 | **Optional-extras manifest** for the ~50 heavy imports (litellm/torch/…). | S | F-005 |
| R-5 | **Mirror cleanup runbook**: delete remaining `scripts/ops` mirrors. | S | D-1, D-4, D-6 |
| R-6 | **Gateway SSOT decision**: declare `gateway/service/app.py` the production gateway. | M | F-013, D-2, D-3, D-8 |
| R-7 | **Shared-utils dedup pass**: `core/utils/time.py`, firestore client factory, admin dep. | S | D-7, D-9 |
| R-8 | **JWKS-verify the studio token-exchange role mapping**. | S | §5.1 |
| R-9 | **Capability heartbeat**: boot-time endpoint/report listing every background agent state. | S | §5.2, §5.5 |
| R-10 | **Sign self-patches**: `SelfUpdater` accepts only patches signed with dedicated Infisical key. | M | §5.5 |
| R-11 | **Repo diet**: target <60 MB hot repo. | S | weight |
| R-12 | **Scan automation**: run compile-all, import-resolve, and hash-dupe in CI. | S | regression safety |

---

## 7. Patch Index

| Patch | Severity | Type | Files | Status |
|---|---|---|---|---|
| `0001` | CRITICAL | Redact leaked admin key | `docs/SUPREMEAI_UNIFIED_CHAT_PIPELINE_SSOT.md` | APPLIED |
| `0002` | HIGH | Harden CI self-hosted runner & auto-merge | `.github/workflows/unified-pipeline.yml` | APPLIED |
| `0003` | MED | Guard opentelemetry imports | `core/telemetry/__init__.py` | APPLIED |
| `0004` | MED | Declare tenacity + opentelemetry-sdk | `core/requirements.txt` | APPLIED |
| `0005` | LOW | Constant-time static key comparison | `gateway/service/app.py` | APPLIED |
| `0006` | MED | Remove 6 stale unreferenced mirrors | `scripts/ops/` (6 files) | APPLIED |
| `0007` | LOW | Remove broken cloudflare index shim | `infrastructure/cloudflare/index.js` | APPLIED |
