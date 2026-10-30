# Archive Directory — SupremeAI API Gateway

This directory contains legacy, unmaintained, or superseded components preserved for git history reference.

### 1. `archive/legacy_gateway/`
- **What it was:** The initial v0 monolithic gateway implementation containing `main.py` (16KB), custom rate limiters, server runners, and manual chain walkers.
- **Why archived:** It duplicated the `service/` thin gateway architecture, creating confusion, deployment routing failures (`x-render-routing: no-server`), and tight coupling to static configurations.

### 2. `archive/legacy_config/`
- **What it was:** Static JSON routing policies (`routing_policy.example.json`, `routing_policy.schema.json`).
- **Why archived:** Superseded by the Dynamic Load-Balanced Pool with zero-hardcoding key discovery. All keys matching provider patterns (e.g., `GEMINI_API_KEY_*`, `GROQ_API_KEY_*`) are dynamically discovered and balanced in runtime without requiring manual JSON edits.
