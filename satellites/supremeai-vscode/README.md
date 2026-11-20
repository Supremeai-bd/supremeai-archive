# SupremeAI VS Code Extension

Developer workflow bridge and live federation runway telemetry for **SupremeAI** autonomous agents.

[![VS Code Extension Release](https://github.com/Supremeai-bd/supremeai-vscode/actions/workflows/vscode-release.yml/badge.svg)](https://github.com/Supremeai-bd/supremeai-vscode/actions/workflows/vscode-release.yml)
[![Latest Release](https://img.shields.io/github/v/release/Supremeai-bd/supremeai-vscode)](https://github.com/Supremeai-bd/supremeai-vscode/releases)

---

## 🌟 Key Features

- **Federation Runway Telemetry**:
  - Live status bar indicator showing active autonomous agents, pending PR runway, and CI gate health.
- **Autonomous Task Dispatcher**:
  - Dispatch tasks directly from your active editor file to the SupremeAI federation agent bus.
- **Inline Code Actions & Assistance**:
  - Quick action menu to ask SupremeAI questions about highlighted code, request refactoring, or generate tests.
- **MCP Bridge Integration**:
  - Seamless Model Context Protocol (MCP) tool discovery and command execution in VS Code.
- **Emergency Autonomy Kill-Switch**:
  - One-click emergency stop command to halt runaway tasks across all federated agents.

---

## 🛠️ Configuration

Configure settings in `settings.json` or through the VS Code Settings UI (`supremeai.*`):

| Setting | Default | Description |
|---|---|---|
| `supremeai.gatewayUrl` | `http://127.0.0.1:8080` | SupremeAI Gateway base URL |
| `supremeai.apiKey` | `""` | X-SupremeAI-Key authentication token (or `SUPREMEAI_API_KEY` env) |
| `supremeai.model` | `auto` | Default model tier (`auto`, `fast`, `balanced`, `pro`) |
| `supremeai.pollCadenceSeconds` | `30` | Telemetry poll frequency in seconds |
| `supremeai.enableNotifications` | `true` | Toast notifications on task completion or CI gate alert |

---

## 🚀 Development & Packaging

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Run tests
npm test

# Package into a standalone .vsix installer
npx @vscode/vsce package --no-git-tag-version
```

---

## 📦 Automated Release Pipeline

GitHub Actions automatically builds and publishes `.vsix` releases:
- **On Tag Push**: Push a tag matching `v*` (e.g., `v0.1.0`) to compile, test, package `.vsix`, and create a GitHub Release.
- **Manual Trigger**: Go to **Actions** -> **SupremeAI VS Code Extension Build & Release** -> **Run workflow**.
