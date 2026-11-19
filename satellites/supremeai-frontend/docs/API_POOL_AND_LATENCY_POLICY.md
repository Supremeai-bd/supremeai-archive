# SupremeAI API Pool & Latency Routing Policy (Protected Invariant)

> **Scope:** Cross-Federation Contract between **`Supremeai-bd/supremeai`** (Core Backend / LLM Gateway) and **`Supremeai-bd/supremeai-frontend`** (Studio Web Satellite).  
> **Status:** **LOCKED — Do NOT modify, remove, or "upgrade" without explicit user authorization and live latency benchmark proof.**

---

## 1. Protected Fast-Response Gemini Pool Configuration (`Supremeai-bd/supremeai`)

1. **Preserve `gemini-1.5-latest` / `gemini-1.5-flash-latest` in the Backend API Pool:**
   - Production telemetry and live API pool latency checks in `Supremeai-bd/supremeai` have verified that **`gemini-1.5-latest`** (including `gemini-1.5-flash-latest`) delivers faster time-to-first-token and overall response latency for the fast squad pool.
   - **Prohibition for AI Agents:** Do **not** automatically replace, remove, rename, or "upgrade" `gemini-1.5-latest` / `gemini-1.5-flash-latest` in the backend API pool (`Supremeai-bd/supremeai`) to newer model identifiers (e.g. assuming newer version numbers are faster) unless the user explicitly instructs you to do so after reviewing latency telemetry.

2. **Preserve Latency-Based Dynamic Routing (`DynamicRouteArbiter`):**
   - The backend `Supremeai-bd/supremeai` operates an active multi-key API pool (currently **36 healthy keys** across adaptive routes, with **35 keys** in the `supremeai-api` multi-key squad) governed by real-time **latency checking**, health scoring, and automatic cooldown cascades.
   - **Prohibition for AI Agents:** Do **not** disable, bypass, or override the backend latency-checking probes or latency-weighted route selection with hardcoded static routes or manual overrides.

---

## 2. Frontend Satellite Passthrough Contract (`Supremeai-bd/supremeai-frontend`)

1. **Native Model Slugs Only:**
   - Frontend clients (`src/services/chatService.ts`, `src/data/models.ts`, `functions/api/*`) must continue sending native SupremeAI model slugs (`supreme-spark`, `supreme-core`, `supreme-reason`, `supreme-deep`, `supremeai-web`, `supremeai-api`, `auto`) to `/api/v1/stream/chat` and `/v1/chat/completions`.
   - Never hardcode provider-specific Gemini/OpenAI model IDs into frontend request payloads to the `Supremeai-bd/supremeai` gateway; let the backend `DynamicRouteArbiter` and latency checker choose the fastest healthy pool candidate.

2. **Latency Visibility:**
   - Chat messages include millisecond send-to-output timestamps (`HH:MM:SS.mmm` and `(+Δms)`) in `ChatThread` / `ChatMessageItem`, and Gateway latency telemetry is surfaced in Admin/API Keys views without interfering with backend routing decisions.

---

## 3. Change Control Checklist

Before modifying any API pool model list, Gemini model alias, or latency-checking threshold in **`Supremeai-bd/supremeai`** or this repository:

1. Obtain explicit written confirmation from the repository owner.
2. Run comparative latency checks against the active pool keys and verify both TTFT and total completion latency do not regress.
3. Preserve fallback and cooldown behavior for all healthy keys in the squad.
