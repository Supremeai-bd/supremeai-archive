# Archived `studio` Features

These optional heavy client-side features were moved out of `studio/src` into `archive/studio` to keep `studio` lightweight. Each entry mirrors its original path under `studio/` so you can restore any feature selectively later.

| Feature | Archived File(s) | Required npm package(s) | Call-site to restore |
|---|---|---|---|
| Client-side Kokoro TTS | `src/lib/workers/kokoro.worker.ts` | `kokoro-js`, `@huggingface/transformers` | `studio/src/lib/workers/KokoroWorker.ts` |
| 3D VRM Voice Avatar | `src/lib/utils/voice-avatar-animation.ts`, `src/lib/utils/voice-avatar-renderer.ts` | `@pixiv/three-vrm`, `@pixiv/three-vrm-animation` | `studio/src/lib/components/chat/MessageInput/CallOverlay/VoiceAvatar.svelte` |
| In-browser SQLite Viewer | `src/lib/components/chat/FileNav/SqliteView.svelte` | `sql.js` | `studio/src/lib/components/chat/FileNav/FilePreview.svelte` |
| Map Coordinate Selector | `src/lib/components/common/Valves/MapSelector.svelte` | `leaflet` | `studio/src/lib/components/chat/MessageInput/InputVariablesModal.svelte`, `studio/src/lib/components/common/Valves.svelte` |
| Unused MediaPipe dep | *(none — 0 usages)* | `@mediapipe/tasks-vision` | *(removed from `studio/package.json`)* |

