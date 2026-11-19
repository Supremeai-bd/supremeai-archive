# SupremeAI Frontend — পূর্ণ কোড অডিট ও উন্নয়ন তালিকা

> **ব্রাঞ্চ:** `arena/f813410c-supremeai-frontend` (base: `b265899` — PR #4 squash-merge সহ `main`)
> **অডিটের ধরন:** স্ট্যাটিক কোড অডিট + টেস্ট/বিল্ড রান + ডিপেন্ডেন্সি ও সিকিউরিটি অডিট
> **নীতি:** অডিটটি প্রথমে শুধু বিশ্লেষণ ছিল; এখন এটি একইসাথে **অগ্রগতির লেজার** — যা ঠিক হয়েছে তা ✅/🟡 চিহ্ন ও কমিট হ্যাশ দিয়ে দেখানো, যা বাকি তা শেষে তালিকাভুক্ত।

---

## ০. এক নজরে (Executive Summary)

বেসলাইন **সবুজ**: `tsc --noEmit` ক্লিন (TypeScript ৫.৯, `strict`), **২১৬/২১৬ টেস্ট পাস** (৩২ ফাইল), ESLint **০ এরর**, i18n/fetch/`any` র্যাচেট পাস, প্রোডাকশন বিল্ড **~২.৩s** — অর্থাৎ `AGENTS.md`-এর "unit tests + build < 5s" শর্ত পূরণ হচ্ছে।

**ইঞ্জিনিয়ারিং গভর্নেন্স** এখন অনেকটা মেরামত হয়েছে: CI গেট চালু, `strict` চালু, ESLint ১০ (flat config) + Prettier, কম্পোনেন্ট টেস্ট + কভারেজ থ্রেশহোল্ড + Playwright স্মোক স্যুট, ক্লায়েন্ট-এরর টেলিমেট্রি। যা **এখনো বাকি**: **৬০৭**টি হার্ডকোডেড UI স্ট্রিং (৭৫১ থেকে), **৫২**টি `any` (৮৩ থেকে), `server.ts` ১০,৫৩৫ লাইনের মনোলিথ এবং `UserSettingsView` (২,৪৩৬ → ২,১৯৯ লাইন) ভাঙা।

**সবচেয়ে বড় ৫টি ঝুঁকি**

1. ~~**কোয়ালিটির গেট নেই**~~ → ✅ **ঠিক হয়েছে** — PR-এ `npm ci` → audit → `tsc` → ESLint → i18n/fetch/`any` র্যাচেট → কভারেজ টেস্ট → build চলে।
2. **সেশন/নিরাপত্তা** — `apiClient`-এ 401/টোকেন রিফ্রেশ নেই, প্রোডাকশনে কোনো CSP/সিকিউরিটি হেডার নেই, অ্যাক্সেস টোকেন `localStorage`-এ।
3. **নির্ভরতা** — `npm audit`-এ **5 high** (vite চেইন), `vite` প্রোডাকশন ডিপেন্ডেন্সিতে, `esbuild` পিন-কনফ্লিক্টের কারণে ইনস্টল `--legacy-peer-deps` ছাড়াই চলে না, এবং `npm ci` পুরোপুরি ব্যর্থ।
4. **টাইপ-সেফটি** — 🟡 `strict` ও unused-flag চালু, কিন্তু **৮৩** `any` এখনো আছে (`scripts/any-baseline.json` বাজেট, কেবল কমতে পারে)।
5. ~~**রিয়েল-ডেটা ফ্যাব্রিক যুক্ত হয়নি**~~ → ✅ **ঠিক হয়েছে** — HITL, MCP Tower, Platform Policy ফেডারেশন স্ন্যাপশট থেকেই চলে (`430e365`)।

---

## ০ক. বাস্তবায়নের অগ্রগতি (আপডেট: ২০২৬-১১-১৮)

বেসলাইন এখন: `tsc` ক্লিন (**`strict`** + unused-flag, TypeScript ৫.৯) · **২১৬** টেস্ট (৩২ ফাইল) · ESLint **০ এরর** · i18n র্যাচেট **৬০৭** · raw-fetch র্যাচেট **৫৪** · `any` বাজেট **৫২** · কভারেজ গেট চালু · বিল্ড **~২.৩s** · `npm audit --omit=dev` → **০**।

| #            | আইটেম                    | অবস্থা                                                                                                                 | কমিট                            |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| ১            | PR-এ CI গেট              | ✅ `ci.yml` (npm ci → audit → tsc → test → build)                                                                     | `2db2441`                       |
| ২            | Deploy শর্ত               | ✅ secret job-level `env`-এ; স্কিপ হলে ওয়ার্নিং + সামারি                                                                | `2db2441`                       |
| ৩            | 401/refresh              | ✅ single-flight রিফ্রেশ + এক রিট্রাই + session-expired ইভেন্ট + ৬ টেস্ট                                                  | `fce6671`                       |
| ৪            | CSP/হেডার                | 🟡 `_headers` + Pages middleware-এ বেসলাইন CSP/হেডার; টোকেন এখনো `localStorage`-এ                                     | `57ba2bf`                       |
| ৫ / ৫ক       | ইনস্টল ও অডিট             | ✅ `npm ci` চলে (legacy flag ছাড়া), prod অডিট ০, esbuild পিন বাদ                                                      | `35016a8`                       |
| ১০           | টাইপ-সেফটি               | ✅ `strict` + `noImplicitOverride` + unused-flag চালু, শূন্য এরর                                                         | `2a6515a`, `dbbd2e0`            |
| ১২           | a11y                     | 🟡 গ্লোবাল `:focus-visible`, key ফিক্স; মোডাল focus-trap বাকি                                                           | `57ba2bf`, `4a55571`            |
| ১৭           | ডিপেন্ডেন্সি হাইজিন        | ✅ playwright/react-is/@types/autoprefixer বাদ, বিল্ড-টুল devDeps-এ                                                     | `35016a8`                       |
| ১৮           | Smoke স্ক্রিপ্ট             | ✅ ১৩ পাথ, JSON/HTML/5xx/টাইমআউট চেক, bounded concurrency                                                             | `72a4222`                       |
| ১৯           | ডেড কোড                  | ✅ ৫ মডিউল / ৫৩৬ লাইন অপসারিত                                                                                         | `7faf6c7`                       |
| ২৫ / ২৮ / ৩১ | SEO, README, রানটাইম পিন | ✅ ক্যানোনিক্যাল/কানোনিক্যাল hreflang, robots, README, LICENSE, `.nvmrc`, `engines`                                      | `57ba2bf`, `39942c8`            |
| ৬            | ফ্যাব্রিক → ফিচার ভিউ      | ✅ `federationBridge` + `useFederationLive`; HITL, MCP Tower, Platform Policy এখন স্ন্যাপশট থেকে চলে                    | `430e365`                       |
| ৭            | ডুপ্লিকেট পোলিং            | ✅ HITL-এর ১৫s `setInterval` বাদ, একই এন্ডপয়েন্টে দ্বিতীয় কল নেই                                                         | `430e365`                       |
| ৯            | টেস্টিং                   | 🟡 jsdom+RTL কম্পোনেন্ট টেস্ট + কভারেজ থ্রেশহোল্ড CI-তে; Playwright স্মোক স্যুট যোগ, প্রথম সবুজ রান বাকি                        | `a2acd4e`, `539c6d9`            |
| ৪            | কঠোর CSP                 | 🟡 `script-src`/`style-src`/`connect-src`/`frame-src` হোস্ট-অনুমোদিত; nonce ও `unsafe-eval` বাদ দেওয়া বাকি              | `449bfeb`                       |
| ১০           | `any` বাজেট              | 🟡 ১৬৩ → **৫২**; `check-any.mjs` বাজেট বাড়তে দেয় না                                                                   | `07ef093`, `a01e820`            |
| ১১           | i18n ভাগ ও গার্ড          | 🟡 `src/locales/{en,bn}.ts`; গার্ড ৮১১ → **৬০৭**; শীর্ষ ৩ অ্যাডমিন ভিউ মাইগ্রেট                                           | `cb0443b`, `60d4d58`, `11d0b8b` |
| ১৩           | নেটওয়ার্ক লেয়ার           | 🟡 `utils/http.ts` (টাইমআউট + টাইপড `HttpError`), ৩ ফাইল মাইগ্রেট; `check-http.mjs` নতুন raw fetch আটকায়                | `07ef093`                       |
| ১৪           | অবজারভেবিলিটি            | ✅ `reportClientError` + গ্লোবাল হ্যান্ডলার + `ErrorBoundary`; `/api/telemetry/client-error` (Express ও Pages Functions) | `e6c556a`                       |
| ৩১           | টুলিং                     | ✅ ESLint ১০ flat config + Prettier + `format:check`; `npm run lint:all` = tsc + eslint                               | `f83a379`                       |
| ২০           | দৈত্য ফাইল ভাঙা           | 🟡 `UserSettingsView` ২,৪৩৬ → ২,১৯৯ (account প্যানেল আলাদা); `server.ts` বাকি                                          | `136731f`                       |

### অডিট সংশোধনী (যাচাই করে ভুল প্রমাণিত)

- **`<img>` alt:** প্রথম পাসে "৭/৭ alt ছাড়া" বলা হয়েছিল — ভুল। সাতটি `<img>`-এর **সবগুলোতেই** `alt` আছে (কিছু মাল্টি-লাইন ট্যাগের কারণে গ্রেপ মিস করেছিল)। প্রকৃত ঘাটতি ছিল গ্লোবাল `:focus-visible` ও মোডাল ফোকাস-ট্র্যাপ — সেগুলোই ঠিক করা হয়েছে/বাকি।
- **`html lang`:** ইতিমধ্যে `App.tsx:500`-এ ডাইনামিকভাবে সিঙ্ক হয় — নতুন কিছু লাগেনি।
- **`key={index}`:** ৮ নয়, ১৬টি; এর মধ্যে স্কেলিটন/লগ/ডিফ লাইনগুলোতে ইনডেক্স কী সঠিক, শুধু ৪টি ডেটা-লিস্ট ঠিক করা হয়েছে।

---

### ০খ. এখনো বাকি (প্রত্যক্ষ তালিকা)

1. **i18n মাইগ্রেশন** — ৬০৭টি স্ট্রিং; বড় তিনটি অ্যাডমিন ভিউ (ProviderKeys ৫২, McpTower ৩৭, Overview ৩৮) হয়ে গেছে। প্রতি ব্যাচের পর `npm run i18n:update`।
2. **`any` ৫২টি** — `authService` (১০), `useControlCenterStore` (৬), `adminService` (৬), `useControlCenterStore` (৬) বাকি; `apiClient` ও `conversationService` শেষ; `unknown` + গার্ডে বদলে `npm run any:update`।
3. **`server.ts` (১০,৫৩৫ লাইন)** — রুট-গ্রুপগুলো (`billing`, `telemetry`, `workspace`) আলাদা রাউটার মডিউলে বের করার পরিকল্পনা; শেয়ার্ড ক্লোজার ও ইন-মেমরি স্টেট থাকায় ধাপে ধাপে করতে হবে।
4. **`UserSettingsView`** — account প্যানেল বেরিয়ে ২,১৯৯ লাইনে নেমেছে (`AccountSettingsPanel.tsx`, ২৮৭ লাইন); appearance (৬৩৪), voice-avatar (৪৮৩), general (৫৬৭) বাকি — একই প্যাটার্নে।
5. **CSP nonce / `unsafe-eval` বাদ** — ❌ ব্লকড: প্রিভিউ ও আর্টিফ্যাক্ট `<iframe srcdoc>`-এ রেন্ডার হয়, আর srcdoc ডকুমেন্ট **প্যারেন্টের CSP উত্তরাধিকারে** চলে (`script-src 'self'` হলে ভেতরের ইনলাইন রানটাইম চলবে না)। সমাধান: প্রিভিউ রানটাইমকে `/preview/host.html`-এ সরিয়ে আলাদা শিথিল CSP দেওয়া এবং কোড `postMessage`-এ পাঠানো — বড় রিফ্যাক্টর, ব্রাউজার-টেস্ট ছাড়া ঝুঁকিপূর্ণ।
6. **Playwright** — ❌ এই পরিবেশে ব্লকড: `playwright install chromium`-এর ডাউনলোড হোস্ট (`cdn.playwright.dev`) অনুমোদিত নয়। `npx playwright test --list` দিয়ে ৩ ফাইল / ৫ টেস্টের সিনট্যাক্স যাচাই হয়েছে; সবুজ রান GitHub Actions-এ চালাতে হবে (`.github/workflows/e2e.yml`)।
7. **Prettier** — রিপো `--write` করা হয়েছে; `src/locales` ও র্যাচেট baseline ফাইল বাদ। নতুন কোডে `npm run format:check` সবুজ রাখতে হবে।

8. **Prettier** — রিপো `--write` করা হয়েছে (`024d1bd`); `src/locales` ও র্যাচেট baseline ফাইল ইচ্ছাকৃতভাবে বাদ। নতুন কোডে `npm run format:check` সবুজ রাখতে হবে।

## ১. স্কোরকার্ড

| ক্ষেত্র              | রেটিং                                                                                                              | সংক্ষিপ্ত কারণ                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ফিচার সম্পূর্ণতা      | 🟢 ভালো                                                                                                            | ৩২টি সাব-ভিউ, ভয়েস, ওয়ার্কস্পেস, অ্যাডমিন, ফেডারেশন কনসোল              |
| ডিজাইন সিস্টেম / UI | 🟢 ভালো                                                                                                            | Tailwind v4 টোকেন, ডার্ক/লাইট, reduced-motion সমর্থন                  |
| আর্কিটেকচার         | 🟠 মাঝারি                                                                                                          | `server.ts` ৯.৬k লাইন, ২০টি নন-টেস্ট ফাইল > ১০০০ লাইন                |
| টাইপ-সেফটি         | 🟠 মাঝারি                                                                                                          | `strict` বন্ধ, ১৬৩ `any`, ৫৬ unused                                  |
| টেস্টিং             | 🟠 মাঝারি                                                                                                          | ১৮৭ ইউনিট টেস্ট, কিন্তু **০** কম্পোনেন্ট/E2E, coverage নেই               |
| CI/CD              | 🔴 দুর্বল                                                                                                            | PR-এ কোনো চেক নেই, deploy শর্ত সন্দেহজনক                              |
| নিরাপত্তা           | 🟠 মাঝারি                                                                                                          | DOMPurify/iframe sandbox ভালো, কিন্তু CSP হেডার ও টোকেন স্টোরেজ ঝুঁকিপূর্ণ |
| পারফরম্যান্স         | 🟠 মাঝারি                                                                                                          | মেইন চাংক ৮৯৭ kB (২৬৩ kB gzip), CSS ২১৪ kB                          |
| i18n               | `src/locales/{en,bn}.ts` (en ১,১৮৩ · bn ১,১৮২ লাইন), `check-i18n.mjs` গার্ড, **৭৫১** হার্ডকোডেড স্ট্রিং বাকি (৬০ ফাইল) |
| অ্যাক্সেসিবিলিটি     | 🟠 মাঝারি                                                                                                          | ৭/৭ `<img>`-এ `alt` নেই, `focus-visible` শূন্য, মোডাল ফোকাস-ট্র্যাপ নেই |
| DX / রিপো হাইজিন   | 🔴 দুর্বল                                                                                                            | লিন্টার/ফরম্যাটার নেই, ২টি লকফাইল, ডেড কোড, AI Studio বয়লারপ্লেট       |

---

## ২. পরিমাপ (বর্তমান অবস্থা)

| মেট্রিক         | মান                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| সোর্স ফাইল      | ২১৮ (`src/`), মোট **৮৪,০৯২** লাইন                                                                                                    |
| কম্পোনেন্ট       | ৮১টি `.tsx` (৩১টি অ্যাডমিন ভিউ), ২৩টি ফাইল > ১,০০০ লাইন (টেস্ট বাদে ২০)                                                                |
| স্টোর           | ১০,২০৩ লাইন (`useThemeStore` ২,১২৮ · `useChatStore` ১,৬০৬ · `useWorkspaceStore` ১,৪৭৭)                                               |
| `server.ts`    | **৯,৫৯৫** লাইন, **১৪০**টি রুট/মিডলওয়্যার রেজিস্ট্রেশন                                                                                    |
| টেস্ট           | ৩২ ফাইল, **২১৬** টেস্ট · jsdom কম্পোনেন্ট টেস্ট · v8 কভারেজ গেট (২৫% statements) · Playwright স্মোক স্যুট (৩ ফ্লো)                           |
| টাইপ           | `strict` ✅, `any` **৫২** (বাজেট ৮৩ → ৫২), `@ts-ignore` **০**, unused local **০**, TypeScript ৫.৯                                    |
| নেটওয়ার্ক       | ৫৪ raw `fetch()` (২২ ফাইল, র্যাচেটেড — আগে ২৬+ ফাইল), `apiClient` + `utils/http.ts`, ১২ ফাঁকা `catch` (৩৬টি `logger.debug`-এ রূপান্তরিত) |
| i18n           | `src/locales/{en,bn}.ts`, `check-i18n.mjs` গার্ড, **৬০৭** হার্ডকোডেড স্ট্রিং বাকি (৫৯ ফাইল)                                              |
| বান্ডল          | `index` ৮৯৭.৪৫ kB (২৬২.৮৫ gzip) · CSS ২১৪.৪ kB · three ৫৭৮ kB · charts ৪১১ kB · xterm ৩৩২ kB · firebase ১৬০ kB                       |
| ডিপেন্ডেন্সি     | ৩৫→কমে আসা prod সেট + dev; `npm audit --omit=dev`: **০** (dev-only vite/picomatch বাকি)                                              |
| সরঞ্জাম         | ✅ ESLint ১০ (flat) + typescript-eslint, Prettier + `format:check`, র্যাচেট স্ক্রিপ্ট ৩টি, Playwright                                    |
| স্টোরেজ         | `supremeai*` কী **১০০**টি, চ্যাট সেশন `localStorage`-এ                                                                                |
| অ্যাক্সেসিবিলিটি | `aria-label` ১০৮, `alt` ছাড়া `<img>` ৭/৭, `focus-visible` ০                                                                          |

---

## ৩. 🔴 P0 — আগামী ১–২ সপ্তাহে (নিরাপত্তা ও রিলিজ গেট)

### ১. ✅ PR-এ কোনো CI চেক নেই

- **প্রমাণ:** `.github/workflows/deploy.yml` শুধু `push: branches: [main]`-এ চলে; PR-এ কোনো workflow নেই; `gh pr checks 4` → "no checks reported"।
- **প্রভাব:** ভাঙা টাইপ/টেস্ট/বিল্ড সরাসরি `main`-এ মার্জ হয়ে ডিপ্লয় হতে পারে; রিভিউয়ার কোনো স্বয়ংক্রিয় প্রমাণ পান না।
- **সমাধান:** `pull_request` ট্রিগারসহ `ci.yml` — `tsc --noEmit` + `vitest run --coverage` + `vite build` (artifact আপলোড), Node 22 ক্যাশড; branch protection-এ required check।
- **পরিশ্রম:** ২–৩ ঘণ্টা।

### ২. ✅ Deploy স্টেপের শর্ত কার্যকর না হওয়ার ঝুঁকি

- **প্রমাণ:** `deploy.yml`-এ `if: env.CLOUDFLARE_API_TOKEN != ''` একই স্টেপের `env:` ব্লকে ভেরিয়েবল সেট করে।
- **প্রভাব:** শর্তটি ফাঁকা হিসেবে মূল্যায়িত হলে ডিপ্লয় নীরবে স্কিপ হবে (সবুজ ওয়ার্কফ্লো, নতুন কোড লাইভ নয়)।
- **সমাধান:** শর্ত job/step-level `env` থেকে সরিয়ে `secrets` চেক বা আলাদা `deploy` job + `needs` করুন; ডিপ্লয়ের পর `scripts/smoke-live.mjs` চালান।
- **পরিশ্রম:** ১ ঘণ্টা।

### ৩. ✅ সেশন এক্সপায়ার হলে অ্যাপ ভাঙে (401/refresh হ্যান্ডলিং নেই)

- **প্রমাণ:** `src/services/apiClient.ts`, `src/services/authService.ts`, `src/stores/useAuthStore.ts` — কোথাও `401`, `refresh`, `refresh_token` হ্যান্ডলিং নেই। ব্যাকএন্ডে `/api/v1/auth/refresh` আছে।
- **প্রভাব:** অ্যাক্সেস টোকেন মেয়াদোত্তীর্ণ হলে প্রতিটি ভিউ "errors" দেখাবে; ইউজারকে ম্যানুয়ালি লগআউট/লগইন করতে হবে।
- **সমাধান:** `apiClient`-এ এককালীন 401 ইন্টারসেপ্টর → `/api/v1/auth/refresh` → রিট্রাই; রিফ্রেশ ব্যর্থ হলে সফট লগআউট + টোস্ট; গেস্ট টোকেনের জন্য আলাদা পথ।
- **পরিশ্রম:** ১ দিন (+ টেস্ট)।

### ৪. 🟡 প্রোডাকশনে কোনো CSP / সিকিউরিটি হেডার নেই + টোকেন `localStorage`-এ

- **অগ্রগতি:** `public/_headers`-এ কঠোর অনুমোদিত-তালিকা CSP (`script-src` `'self'` + unpkg/jsDelivr/esm.sh/tailwind CDN, `connect-src 'self' https: wss:`, `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`); `/assets/*` আলাদা করে `cross-origin` যাতে স্যান্ডবক্স প্রিভিউ ভাঙে না। বাকি: nonce-ভিত্তিক `script-src` ও `unsafe-eval` বাদ (এর জন্য প্রিভিউ রানটাইম লোকালি বান্ডল করতে হবে), টোকেন httpOnly-তে সরানো (`449bfeb`)।

- **প্রমাণ:** `functions/**`-এ `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` — কোনোটি সেট হয় না (`browserProxyHtml.ts` শুধু প্রক্সি করা পেজের CSP _সরায়_)। টোকেন: `localStorage.getItem('supremeai_access_token')`, অ্যাডমিন টোকেন `sessionStorage`।
- **প্রভাব:** যেকোনো XSS (LLM-জেনারেটেড কনটেন্ট, Gmail HTML, আর্টিফ্যাক্ট) টোকেন চুরি করতে পারে; clickjacking-এর সুরক্ষা নেই। DOMPurify + iframe `sandbox` পুরোপুরি ঢাল নয়।
- **সমাধান:** (ক) Cloudflare `_headers` বা edge middleware-এ কঠোর CSP (nonce সহ), `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`; (খ) মধ্যমেয়াদে টোকেন httpOnly cookie-তে বা in-memory + BFF প্যাটার্নে সরান; (গ) `dangerouslySetInnerHTML`-এর দুটি জায়গায় আরও কঠোর DOMPurify কনফিগ।
- **পরিশ্রম:** ১–২ দিন।

### ৫. ✅ ডিপেন্ডেন্সি ভালনারেবিলিটি ও ইনস্টল-কনফ্লিক্ট

- **প্রমাণ:** `npm audit --omit=dev` → `{"high":5}` (`vite`, `@vitejs/plugin-react`, `fdir`, `picomatch`, `tinyglobby`)। `npm install` সরাসরি ব্যর্থ হয়: `esbuild@0.25` বনাম vite 8-এর `^0.27/^0.28` → `--legacy-peer-deps` বাধ্যতামূলক (CI-ও এটাই ব্যবহার করছে)।
- **প্রভাব:** ভবিষ্যতে ডিপেন্ডেন্সি আপডেট/অডিট ব্লকড; build-toolchain দুর্বলতা।
- **সমাধান:** `esbuild` ডেভ-ডিপেন্ডেন্সি সরিয়ে vite-এর নিজস্ব 버전 ব্যবহার; `vite`/`@vitejs/plugin-react` প্যাচ আপডেট; `--legacy-peer-deps` ছাড়া ইনস্টল নিশ্চিত করে CI-তে `npm ci`; একটাই লকফাইল রাখুন (`bun.lock` ১৩৫ kB + `package-lock.json` ২৫৭ kB দুটোই আছে)।
- **পরিশ্রম:** আধা দিন।

### ৫ক. ✅ `npm ci` আদৌ চলে না → রিপ্রোডিউসিবল ইনস্টল নেই

- **প্রমাণ:** `npm ci --dry-run` → `ERESOLVE` (esbuild `^0.25.0` dev-ডিপেন্ডেন্সি বনাম vite 8-এর প্রয়োজন)। এছাড়া `package-lock.json` `package.json`-এর সাথে সিঙ্কে ছিল না (`firebase`, `tesseract.js` এন্ট্রি অনুপস্থিত) — `npm install` চালালে লকফাইলে **+১,৪২৫/−১০৯** লাইন যোগ হয়।
- **প্রভাব:** CI/লোকালে হুবহু একই ডিপেন্ডেন্সি ট্রি নিশ্চিত করার একমাত্র নির্ভরযোগ্য উপায় (`npm ci`) কাজ করে না; লকফাইল ড্রিফট মানে "আমার মেশিনে চলে" ঝুঁকি।
- **সমাধান:** esbuild পিন ঠিক করুন → `npm install` দিয়ে লকফাইল রিজেনারেট → `npm ci` সবুজ নিশ্চিত করে CI-তে `npm ci --no-audit` ব্যবহার করুন; PR-এ লকফাইল ড্রিফট চেক।
- **পরিশ্রম:** ২ ঘণ্টা।

---

## ৪. 🟠 P1 — ৩০ দিনের মধ্যে

### ৬. ✅ লাইভ ডেটা ফ্যাব্রিক এখনো ফিচার ভিউতে যুক্ত হয়নি

- **প্রমাণ:** `useFederationSource`/`useFederationStore` শুধু `src/components/sync/*` ও `Sidebar.tsx`-এ ব্যবহৃত।
- **প্রভাব:** ২৩টি এন্ডপয়েন্ট সিঙ্ক হলেও ড্যাশবোর্ড KPI, Model Matrix, MCP Tower, HITL, Memory ভিউ এখনো নিজেদের ওয়ান-শট কল/স্ট্যাটিক ডেটা ব্যবহার করে → "রিয়েল ডেটা অটো-সিঙ্ক" প্রতিশ্রুতি অর্ধেক।
- **সমাধান:** ফ্যাব্রিক snapshot → বিদ্যমান store-এ অ্যাডাপ্টার ব্রিজ (`platform-config`, `models`, `mcp-tower`, `hitl-pending`, `memory-stats`, `ecosystem-health`); ডুপ্লিকেট পোলার সরান (নিচে #৭)।
- **পরিশ্রম:** ৩–৪ দিন।

### ৭. ✅ ডুপ্লিকেট পোলিং ও একই এন্ডপয়েন্টে একাধিক কল

- **প্রমাণ:** `src/hooks/useHitlApproval.ts:24` প্রতি ১৫s HITL পোল; ফ্যাব্রিকে `hitl-pending` ১৫s। `/api/platform/config` তিন জায়গা থেকে: `adminService.ts:32`, `AdminArchitectureTopologyView.tsx:563`, `federationSources.ts:176`।
- **প্রভাব:** অপ্রয়োজনীয় রিকোয়েস্ট, রেট-লিমিট, ভিন্ন ভিন্ন ডেটা।
- **সমাধান:** ফ্যাব্রিককে একক সোর্স বানিয়ে হুকগুলোকে `useFederationSource`-এ মাইগ্রেট করুন।
- **পরিশ্রম:** ১–২ দিন।

### ৮. `server.ts` মনোলিথ (৯,৫৯৫ লাইন, ১৪০ রুট/মিডলওয়্যার) ও ইন-মেমরি স্টেট

- **প্রমাণ:** `server.ts`-এ কিছু ফাইল-ভিত্তিক রাইট আছে (১৫টি `writeFileSync/readFileSync`), কিন্তু কাস্টমার, api-keys, প্রোভাইডার-মেশ, সোয়ার্ম, কিউ ও রেট-লিমিট বাকেটগুলো প্রসেস মেমরির array/Map-এ — রিস্টার্ট বা নতুন ইনস্ট্যান্সে হারায়।
- **প্রভাব:** রক্ষণাবেক্ষণ কঠিন, ডুপ্লিকেট লজিক, মাল্টি-ইনস্ট্যান্সে অসামঞ্জস্য।
- **সমাধান:** `server/routes/*`-এ ভাগ (auth, admin, workspace, billing, chat, federation); স্টেট Supabase/Redis-এ বা কমপক্ষে `.studio-data/` JSON-এ; Zod স্কিমা ভ্যালিডেশন।
- **পরিশ্রম:** ১–২ সপ্তাহ (ধাপে ধাপে)।

### ৯. 🟡 টেস্টিং স্ট্র্যাটেজি অসম্পূর্ণ — কম্পোনেন্ট/E2E শূন্য, coverage নেই

- **অগ্রগতি:** jsdom + RTL কম্পোনেন্ট টেস্ট, v8 কভারেজ থ্রেশহোল্ড (২৪/২৪/১৯/১৫); `e2e/`-তে ৩টি স্ট্রাকচারাল স্মোক ফ্লো (শেল + ডিপ-লিংক, চ্যাট কম্পোজার ড্রাফট, সাইডবার নেভিগেশন/ফোকাস) ও `.github/workflows/e2e.yml` (এখন `workflow_dispatch`; প্রথম সবুজ রানের পর PR-এ চালু করার পরিকল্পনা)। `vitest` এখন `src/**/*.test.*`-তেই সীমিত, তাই e2e স্পেক দুবার রান হয় না (`539c6d9`)।

- **প্রমাণ:** `vitest.config.ts` → `environment: 'node'`, coverage কনফিগ নেই; ২৬টি টেস্ট ফাইলের সবই utils/services/stores; `playwright` ডিপেন্ডেন্সিতে আছে কিন্তু কোনো e2e টেস্ট নেই।
- **প্রভাব:** UI রিগ্রেশন ধরা পড়ে না; ফ্যাব্রিক কনসোল/চ্যাট/ওয়ার্কস্পেসের মতো জটিল পথ অপরীক্ষিত।
- **সমাধান:** `jsdom` + React Testing Library; coverage threshold (শুরুতে ৪০%, লক্ষ্য ৭০%); Playwright দিয়ে ৩টি স্মোক ফ্লো (লগইন → চ্যাট → সিঙ্ক কনসোল); `scripts/smoke-live.mjs` শুধু ৫টি পাথ চেক করে — বাড়ান।
- **পরিশ্রম:** ১ সপ্তাহ।

### ১০. ✅ টাইপ-সেফটি বেসলাইন

- **অগ্রগতি:** `any` ১৬৩ → **৮৩ → ৫২**; `scripts/check-any.mjs` + `scripts/any-baseline.json` বাজেট রাখে এবং CI বাড়তে দেয় না। TypeScript ৭.০ → ৫.৯ (typescript-eslint এখনো ৭ সমর্থন করে না, ৫.৯-এ ০ এরর)।

- **প্রমাণ:** `tsconfig.json`-এ `strict`, `noUnusedLocals`, `noUncheckedIndexedAccess` নেই; `any` ১৬৩; `tsc --noUnusedLocals` → **৫৬** এরর (`App.tsx`-এ অকেজো সেটার, `UsageView`/`AdminMcpTowerView`-এ অব্যবহৃত আইকন)।
- **পরিশ্রম/সমাধান:** ধাপ ১ — `noUnusedLocals` + `noUnusedParameters` চালু ও ৫৬টি ফিক্স (আধা দিন); ধাপ ২ — `strictNullChecks`; ধাপ ৩ — `strict: true`; `any` প্রতিস্থাপনে `unknown` + গার্ড।
- **পরিশ্রম:** ১–২ সপ্তাহ (ধাপে)।

### ১১. i18n অসম্পূর্ণ (কনট্রাক্ট ভঙ্গ)

- **অগ্রগতি:** ডিকশনারি `src/locales/{en,bn}.ts`-এ ভাগ; `bn` টাইপ `Record<TranslationKeys, string>` তাই অনুবাদ বাদ পড়লে কম্পাইল এরর। `scripts/check-i18n.mjs` (baseline ratchet, ৮১১ → **৭৫১**) CI-তে নতুন হার্ডকোডেড স্ট্রিং আটকায়; `ThemeControlPopover` সম্পূর্ণ মাইগ্রেট (২৭ স্ট্রিং)।

- **প্রমাণ:** `AGENTS.md` §3 অনুযায়ী প্রতিটি UI স্ট্রিং `i18n.ts`-এ থাকতে হবে; কিন্তু ~২৫৪টি হার্ডকোডেড ইংরেজি JSX স্ট্রিং পাওয়া গেছে (বিশেষত অ্যাডমিন ভিউ)। এছাড়া `i18n.ts` একাই ২,৩৯৪ লাইন, ১৩টি `toLocaleString()` লোকেল ছাড়া।
- **প্রভাব:** বাংলা ব্যবহারকারী অ্যাডমিন কনসোলের বড় অংশ ইংরেজিতেই দেখেন; সংখ্যা/তারিখ ফরম্যাট অসামঞ্জস্যপূর্ণ।
- **সমাধান:** (ক) বাকি স্ট্রিং স্ক্যান+মাইগ্রেট (স্ক্রিপ্ট + ম্যানুয়াল রিভিউ); (খ) `locales/en.ts` / `bn.ts` / `index.ts`-এ ভাগ; (গ) `Intl.NumberFormat('bn-BD')` হেল্পার; (ঘ) `document.documentElement.lang` ল্যাঙ্গুয়েজের সাথে সিঙ্ক।
- **পরিশ্রম:** ৩–৫ দিন।

### ১২. 🟡 অ্যাক্সেসিবিলিটি (a11y)

- **প্রমাণ:** ৭টি `<img>`-এর **কোনোটিতেই** `alt` নেই (`ChatInput`, `ChatMessageItem`, `ThemeControlPopover`, `UserSettingsView`, `AdminTwoFactorModal`, `LiveScreenBackdrop`); `focus-visible` স্টাইল **০**; মোডালে focus-trap/Escape মাত্র ৫ জায়গায়; `aria-label` ১০৮টি (ভালো শুরু)।
- **প্রভাব:** স্ক্রিন-রিডার ও কিবোর্ড ব্যবহারকারীর জন্য অনেক ফ্লো অচল; WCAG AA ঝুঁকি।
- **সমাধান:** `alt`/`aria-hidden`, বিশ্বব্যাপী `focus-visible` রিং টোকেন, রিইউজেবল `<Modal>` (focus trap + ESC + `role="dialog"` + `aria-modal`), axe-core CI চেক।
- **পরিশ্রম:** ৩–৪ দিন।

### ১৩. নেটওয়ার্ক লেয়ার ছড়িয়ে আছে

- **অগ্রগতি:** `src/utils/http.ts` — `fetchWithTimeout` (হার্ড টাইমআউট + abort মার্জ) ও `fetchJson` (JSON ডিকোড + `HttpError` ট্যাক্সোনমি, `retryable` ফ্ল্যাগ), ৭টি ইউনিট টেস্ট। `plans`, `browserService`, `AdminAuthModal` মাইগ্রেট; `console.*` → `logger.*`; `scripts/check-http.mjs` নতুন raw fetch আটকায় (৫৪ বাকি, ২২ ফাইলে)।

- **প্রমাণ:** ২৬ ফাইলে সরাসরি `fetch()`, ১৮ ফাইলে `apiClient`; ৫৩টি ফাঁকা/বিস্তৃত `catch`; ২৭টি `console.log/debug`, services/stores-এ ৫৪টি `console.*`।
- **প্রভাব:** টাইমআউট/রিট্রাই/এরর ট্যাক্সোনমি অসামঞ্জস্যপূর্ণ; ব্যর্থতা নীরবে গিলে ফেলা হয়।
- **সমাধান:** একক `http` ক্লায়েন্ট (টাইমআউট, abort, রিট্রাই, 401 রিফ্রেশ, টাইপড এরর); `catch {}` → লগ/টোস্ট/ফ্যালব্যাক; `console` সরিয়ে `logger`।
- **পরিশ্রম:** ৩–৫ দিন।

### ১৪. অবজারভেবিলিটি নেই

- **অগ্রগতি:** `src/services/telemetry.ts` — `reportClientError` + `installGlobalErrorHandlers` (`error`/`unhandledrejection`), প্রতি মেসেজে মিনিটে সর্বোচ্চ ১০টি রিপোর্ট, `keepalive` POST, নীরব ব্যর্থতা। `ErrorBoundary.componentDidCatch` কম্পোনেন্ট স্ট্যাকসহ রিপোর্ট করে; `src/utils/logger.ts` সব লগের একক মুখ।

- **প্রমাণ:** কোনো error-reporting SDK নেই; `ErrorBoundary` মাত্র ২ জায়গায় (`App`, পার-ভিউ)। ক্লায়েন্ট এরর কোথাও পাঠানো হয় না।
- **সমাধান:** হালকা এরর রিপোর্টার (`window.onerror` + `unhandledrejection` + ErrorBoundary → `/api/telemetry/client-error`), সেশন/রিলিজ আইডি ট্যাগিং; ভয়েস/ফ্যাব্রিক/চ্যাট ব্যর্থতা মেট্রিক।
- **পরিশ্রম:** ২–৩ দিন।

### ১৫. পারফরম্যান্স ও বান্ডল

- **প্রমাণ:** মেইন চাংক **৮৯৭ kB** (২৬৩ kB gzip), CSS **২১৪ kB**; Vite সতর্কতা "chunks larger than 500 kB"।
- **সমাধান:** ভিউ-লেভেল কোড-স্প্লিট (ইতিমধ্যে lazy, তবে `App`/`Sidebar`/স্টোর শেল বড়), `recharts`-কে আরও পিছিয়ে দেওয়া, CSS purge যাচাই, `manualChunks`-এ UI-কিট আলাদা, `size-limit` বাজেট CI-তে।
- **পরিশ্রম:** ২–৩ দিন।

### ১৬. ফেস-ডিটেকশন বিল্ড ওয়ার্নিং (কার্যকরী ঝুঁকি)

- **প্রমাণ:** `npm run build` → `[IMPORT_IS_UNDEFINED] Import 'FaceMesh' will always be undefined ... @tensorflow-models/face-landmarks-detection`।
- **প্রভাব:** 3D অ্যাভাটারের ফেস-ট্র্যাকিং নীরবে কাজ না-ও করতে পারে।
- **সমাধান:** `@mediapipe/face_mesh` + tfjs ভার্সন অ্যালাইনমেন্ট, অথবা `face-api.js`/নতুন `@mediapipe/tasks-vision`-এ মাইগ্রেট; ফিচার-ফ্ল্যাগ + ফলব্যাক।
- **পরিশ্রম:** ১–২ দিন।

### ১৭. ✅ ডিপেন্ডেন্সি হাইজিন

- **প্রমাণ:** `playwright` প্রোডাকশন ডিপেন্ডেন্সিতে কিন্তু কোডে অব্যবহৃত; `react-is`, `@types/dompurify` অব্যবহৃত; `autoprefixer` (Tailwind v4 প্লাগিনে প্রয়োজন নেই, postcss কনফিগও নেই); `@types/marked` (marked 18 নিজেই টাইপ দেয়); `firebase` শুধু Gmail OAuth-এর জন্য ডাইনামিক ইমপোর্ট।
- **সমাধান:** অব্যবহৃতগুলো সরান, `@types/*`/টুলিং `devDependencies`-এ, firebase আলাদা ঐচ্ছিক চাংক হিসেবে রাখুন বা Gmail ফিচার ফ্ল্যাগের পেছনে।
- **পরিশ্রম:** আধা দিন।

### ১৮. ✅ `scripts/smoke-live.mjs` অপর্যাপ্ত

- **প্রমাণ:** মাত্র ৫টি পাথ; 404 ছাড়া অন্য ব্যর্থতা (৫০২/৫০৩, HTML রেসপন্স) ধরা পড়ে না।
- **সমাধান:** ফ্যাব্রিকের ২৩টি সোর্স + `/api/v1/stream/chat` SSE হ্যান্ডশেক + কনটেন্ট-টাইপ যাচাই; ব্যর্থতায় non-zero exit (CI/ডিপ্লয়-পরবর্তী গেট)।
- **পরিশ্রম:** আধা দিন।

---

## ৫. 🟡 P2 — ব্যাকলগ (৩০–৯০ দিন)

### ১৯. ✅ ডেড কোড

- **প্রমাণ:** কোনো ইমপোর্ট নেই এমন ৫টি মডিউল (৫৩৬ লাইন): `components/CustomerList.tsx`, `components/chat/AmbientAura.tsx`, `hooks/useMouseGlow.ts`, `services/websocketService.ts`, `utils/dataValidator.ts`।
- **সমাধান:** মুছে ফেলুন বা ফিচার-ফ্ল্যাগে স্পষ্ট করুন; `ts-prune`/`knip` CI-তে।

### ২০. দৈত্যাকার ফাইল/কম্পোনেন্ট

- **প্রমাণ:** `UserSettingsView.tsx` ২,৪১৩ · `i18n.ts` ২,৩৯৪ · `LiveScreenBackdrop.tsx` ২,২৭৬ · `useThemeStore.ts` ২,১২৮ · `App.tsx` ১,৮৫৫ · `controlPlaneRouter.ts` ১,৮০৯ · `WorkspacePreviewTab` ১,৪৮৫ · `phpPreviewRuntime` ১,৪৭৯ — মোট ২০টি নন-টেস্ট ফাইল > ১,০০০ লাইন।
- **সমাধান:** সাব-কম্পোনেন্ট/স্লাইসে ভাগ; `App.tsx` থেকে রাউটিং-শেল, হেডার, ব্যানার, গার্ড আলাদা।

### ২১. নতুন `FederationSyncView.tsx` নিজেই ১,০২৮ লাইন

- **সমাধান:** `SyncHero`, `SyncKpiGrid`, `CoverageMatrix`, `SourceRow`, `InspectorModal`, `ActivityFeed`-এ ভাগ (এখনই সহজ, কোড নতুন)।

### ২২. মডেল ক্যাটালগে তিনটি সোর্স-অব-ট্রুথ

- **প্রমাণ:** `server.ts`-এ `SUPPORTED_MODELS` (লাইন ১০১), `src/data/models.ts` (২৮ জায়গায় ব্যবহৃত), `chatService.ts`-এর নিজস্ব ম্যাপিং।
- **সমাধান:** একটি শেয়ার্ড কনট্রাক্ট (`api-schemas`-এর সাথে মিলিয়ে) + রানটাইমে `/api/models`; স্ট্যাটিক ফাইল শুধু ফলব্যাক।

### ২৩. স্টোরেজ ও সেশন স্কেল

- **প্রমাণ:** ১৮টি `localStorage` কী (মোট ~১০০টি `supremeai*` স্ট্রিং কনস্ট্যান্ট); চ্যাট সেশন (ছবিসহ base64) `localStorage`-এ, ৫ MB কোটা হিট করলে prune।
- **সমাধান:** কেন্দ্রীয় কী-রেজিস্ট্রি + ভার্সন/মাইগ্রেশন; অ্যাটাচমেন্ট IndexedDB-তে; কোটা-সচেতন ইউআই মেসেজ।

### ২৪. ৮টি `key={index}` / `key={i}`

- **প্রভাব:** লিস্ট রিঅর্ডার/ডিলিটে ভুল স্টেট। **সমাধান:** স্থিতিশীল আইডি।

### ২৫. 🟡 SEO ও মেটাডেটা অসঙ্গতি

- **প্রমাণ:** `index.html` hreflang → `https://supremeai.pages.dev/` কিন্তু README ডিপ্লয় ডোমেইন `supremeai-studio.pages.dev`; `robots.txt` `/admin/` ডিসঅ্যালো করে (এমন পাথ নেই); `manifest.json`-এ `"lang": "en"` স্থির ও শুধু SVG আইকন; `html lang` ডাইনামিক নয়।
- **সমাধান:** সঠিক ক্যানোনিক্যাল ডোমেইন, per-locale `lang`, 192/512 PNG আইকন, সাইটম্যাপ।

### ২৬. PWA অসম্পূর্ণ

- **প্রমাণ:** manifest আছে, কিন্তু `serviceWorker` রেজিস্ট্রেশন নেই → ইনস্টলযোগ্যতা ও অফলাইন শেল নেই।
- **সমাধান:** Workbox SW (app shell + API stale-while-revalidate; ফ্যাব্রিক ক্যাশের সাথে সমন্বয়)।

### ২৭. এক্সটার্নাল ফন্ট/CDN নির্ভরতা

- **প্রমাণ:** `index.html` Google Fonts হটলিংক; প্রিভিউ রানটাইম `unpkg`/`esm.sh`/`cdn.tailwindcss.com` থেকে React/Babel/Tailwind/Mermaid লোড করে (`src/config/externalUrls.ts`), যেখানে `esm.sh/react@19.2.0` বনাম প্রজেক্টের `react@19.0.1` — ভার্সন ড্রিফট।
- **সমাধান:** ফন্ট সেলফ-হোস্ট; প্রিভিউ CDN পিন + SRI; আদর্শভাবে প্রিভিউ বান্ডলার লোকাল।

### ২৮. ✅ README / মেটাডেটা বয়লারপ্লেট

- **প্রমাণ:** README শিরোনাম "Run and deploy your AI Studio app" + Google ব্যানার হটলিংক; `metadata.json` AI Studio আর্টিফ্যাক্ট; `package.json` নাম `react-example`, ভার্সন `0.0.0`; `LICENSE` ফাইল নেই।
- **সমাধান:** প্রকৃত প্রোডাক্ট README (আর্কিটেকচার, এনভ, রানবুক), `metadata.json` পরিষ্কার/সরানো, সেমান্টিক ভার্সন, MIT লাইসেন্স।

### ২৯. ডকুমেন্টেশন কম

- **প্রমাণ:** `docs/`-এ মাত্র ২টি ফাইল (+ এই অডিট)।
- **সমাধান:** `ARCHITECTURE.md`, `API_MAP.md`, `RUNBOOK.md`, `SECURITY.md`, `CONTRIBUTING.md`।

### ৩০. `/v1` ডেড কনফিগ ও `_routes.json` সীমা

- **প্রমাণ:** `env.gatewayUrl` ডিফল্ট `/v1` কিন্তু ক্লায়েন্ট কোথাও ব্যবহার করে না; `public/_routes.json` শুধু `/api/*` ইনক্লুড করে — ভবিষ্যতে `/v1/*` কল করলে প্রোডাকশনে SPA HTML ফিরবে।
- **সমাধান:** ডেড কনফিগ সরান বা `/v1/*` প্রক্সি ইনক্লুড করুন।

### ৩১. ✅ Node/রানটাইম পিন নেই

- **প্রমাণ:** `engines` নেই, `.nvmrc` নেই; CI `node-version: 22` কিন্তু লোকাল ডকুমেন্টেশনহীন।
- **সমাধান:** `engines` + `.nvmrc` + `packageManager` (npm/bun একটাই)।

### ৩২. locale-বিহীন ডেট/সংখ্যা ফরম্যাট

- **প্রমাণ:** ১৩টি `toLocaleString()`/`toLocaleDateString()` লোকেল আর্গুমেন্ট ছাড়া।
- **সমাধান:** `Intl` হেল্পার (bn-BD / en-US)।

### ৩৩. Firebase টাইপ-শিম ও ঐচ্ছিক নির্ভরতা

- **প্রমাণ:** `src/types/firebase.d.ts` হাতে লেখা মডিউল ডিক্লারেশন; `firebase` শুধু Gmail OAuth ডাইনামিক ইমপোর্টে।
- **সমাধান:** আসল টাইপ ব্যবহার বা ফিচার-ফ্ল্যাগ + আলাদা চাংক।

### ৩৪. রেট-লিমিট ইন-মেমরি (per instance)

- **প্রমাণ:** `server.ts`-এ `rateBuckets = new Map()` স্লাইডিং উইন্ডো।
- **সমাধান:** মাল্টি-ইনস্ট্যান্সে Redis/Upstash ভিত্তিক, অথবা প্রোডাকশনে edge-এ সীমাবদ্ধতা নিশ্চিত করুন।

### ৩৫. ফ্যাব্রিক এন্ডপয়েন্ট পাথ যাচাই বাকি

- **প্রমাণ:** রেজিস্ট্রিতে `admin/router/live-state` → `/api/v1/admin/router/live-state`; ব্যাকএন্ডে রুটটি `gateway/service/app.py`-এ `/admin/router/live-state` হিসেবে দেখা যায়।
- **সমাধান:** লাইভ গেটওয়ের OpenAPI/manifest-এর সাথে ২৩টি পাথ প্রোগ্রাম্যাটিক্যালি ক্রস-চেক; ভুল হলে `unsupported` হিসেবে নয়, সঠিক পাথে ম্যাপ করুন।

### ৩৬. `ErrorBoundary` সীমিত কভারেজ

- **সমাধান:** চ্যাট, ওয়ার্কস্পেস ডক, ভয়েস, ফ্যাব্রিক — প্রতিটির নিজস্ব বাউন্ডারি + রিপোর্টিং।

### ৩৭. `useEffect` ১১৩টি, hooks-লিন্ট নেই

- **সমাধান:** ESLint + `eslint-plugin-react-hooks` (`exhaustive-deps`), `react-refresh`, `no-floating-promises`।

### ৩৮. ফরম্যাটিং ড্রিফট

- **সমাধান:** Prettier + editorconfig + husky `lint-staged`; CI-তে `format:check`।

### ৩৯. `metadata.json` পারমিশন অসম্পূর্ণ

- **প্রমাণ:** শুধু `microphone`; ফেস-ডিটেকশনের জন্য ক্যামেরা প্রয়োজন হতে পারে।
- **সমাধান:** `camera` পারমিশন ঘোষণা বা শুধু ম্যানুয়াল আপলোডে সীমাবদ্ধ রাখা স্পষ্ট করুন।

### ৪০. ফ্যাব্রিকের ডুপ্লিকেট ইভেন্ট-বাস প্যাটার্ন

- **সমাধান:** ভবিষ্যতে WebSocket/SSE চ্যানেলে (`/api/mcp-tower/stream`, `/api/admin/control-plane/service-health/stream`) ফ্যাব্রিক সোর্স যুক্ত করে পোলিং কমানো।

---

## ৬. দ্রুত জয় (১ দিনের মধ্যে, কম ঝুঁকি)

| #   | কাজ                                                                | ফাইল                       | সময়      |
| --- | ------------------------------------------------------------------ | -------------------------- | -------- |
| ১   | `noUnusedLocals` চালু করে ৫৬টি unused সরানো                         | `tsconfig.json` + ২০ ফাইল  | ২ ঘণ্টা   |
| ২   | ৭টি `<img>`-এ `alt`/`aria-hidden`                                  | ৬ কম্পোনেন্ট                 | ৩০ মিনিট |
| ৩   | `playwright`, `react-is`, `@types/dompurify`, `autoprefixer` সরানো | `package.json`             | ৩০ মিনিট |
| ৪   | `esbuild` পিন ঠিক + লকফাইল রিজেনারেট, `npm ci` সবুজ                 | `package.json`, lock, CI   | ২ ঘণ্টা   |
| ৫   | ডেড ৫ মডিউল (৫৩৬ লাইন) অপসারণ                                      | —                          | ১ ঘণ্টা   |
| ৬   | README/metadata/package নাম-ভার্সন ঠিক করা + LICENSE                | root                       | ১ ঘণ্টা   |
| ৭   | hreflang ডোমেইন ও robots ফিক্স                                      | `index.html`, `robots.txt` | ২০ মিনিট |
| ৮   | `scripts/smoke-live.mjs`-এ ২৩ ফ্যাব্রিক পাথ + কনটেন্ট-টাইপ চেক        | script                     | ২ ঘণ্টা   |
| ৯   | প্রোডাকশন `_headers` (CSP বেসলাইন, nosniff, referrer)               | `public/_headers`          | ১ ঘণ্টা   |
| ১০  | PR-এ `ci.yml` (tsc + test + build)                                 | `.github/workflows`        | ২ ঘণ্টা   |

---

## ৭. ৩০ / ৬০ / ৯০ দিনের রোডম্যাপ

**৩০ দিন — ভিত্তি ও নিরাপত্তা**
`ci.yml` PR গেট · deploy শর্ত ফিক্স · 401/refresh · CSP+হেডার · ডিপেন্ডেন্সি অডিট ক্লিন · `strict` ধাপ ১ · a11y বেসলাইন · dead code পরিষ্কার।

**৬০ দিন — গুণমান ও রিয়েল-ডেটা**
ফ্যাব্রিক → ফিচার ভিউ ইন্টিগ্রেশন + ডুপ্লিকেট পোলার অপসারণ · RTL কম্পোনেন্ট টেস্ট + কভারেজ থ্রেশহোল্ড · নেটওয়ার্ক লেয়ার একীকরণ · i18n বাকি ২৫৪ স্ট্রিং · বান্ডল বাজেট · অবজারভেবিলিটি।

**৯০ দিন — স্কেল ও রক্ষণাবেক্ষণ**
`server.ts` বিভাজন + স্থায়ী স্টোরেজ · `strict` সম্পূর্ণ · Playwright E2E · PWA/অফলাইন · ডকুমেন্টেশন সেট · মডেল ক্যাটালগ SSOT · Firebase/প্রিভিউ CDN নির্ভরতা হ্রাস।

---

## ৮. যাচাই কমান্ড (বর্তমান বেসলাইন)

```bash
npm install --legacy-peer-deps        # এখন বাধ্যতামূলক (#৫ দেখুন)
npx tsc --noEmit                      # ✅ ক্লিন
npm test                              # ✅ 26 ফাইল · 187 টেস্ট
npm run build                         # ✅ 2.44s · index 897 kB (263 kB gzip)
npx tsc --noEmit --noUnusedLocals     # ⚠️ 56 এরর (#১০)
npm audit --omit=dev                  # ⚠️ 5 high (#৫)
node scripts/smoke-live.mjs <url>     # ডিপ্লয়-পরবর্তী ৫-পাথ চেক (#১৮)
```

---

## ৯. যা ইতিমধ্যে ভালো (ধরে রাখুন)

- **টেস্ট ডিসিপ্লিন:** ১৮৭টি টেস্ট, নতুন ফ্যাব্রিকের জন্য ৩০টি সহ — এজ কেস (ETag 304, single-flight, backoff, paused-race) কভার করা।
- **নিরাপত্তা সচেতনতা:** `DOMPurify` দিয়ে HTML স্যানিটাইজ, iframe `sandbox`, TOTP/server security টেস্ট, `@ts-ignore` শূন্য।
- **রেজিলিয়েন্স ডিজাইন:** লোকাল-ফার্স্ট ভয়েস টিয়ার, ফ্যাব্রিকের ক্যাশ/ব্যাকঅফ/ভিজিবিলিটি-পজ, অফলাইন ফলব্যাক।
- **ডিজাইন সিস্টেম:** থিম টোকেন, ডার্ক/লাইট, `prefers-reduced-motion`, স্ক্যানলাইন/গ্লাস ইফেক্ট।
- **পারফরম্যান্স শৃঙ্খলা:** ২.৪s বিল্ড, lazy ভিউ, ম্যানুয়াল চাংক (react/three/charts/xterm আলাদা)।
- **i18n ভিত্তি:** টাইপ-সেফ ডিকশনারি (১,১৩০ কি), `useI18n()` কেন্দ্রীয় হুক।
- **ডকুমেন্টেড নীতি:** `AGENTS.md` ও `docs/API_POOL_AND_LATENCY_POLICY.md` — স্পষ্ট সীমারেখা।

---

_এই তালিকা অগ্রাধিকার অনুযায়ী ধাপে ধাপে বাস্তবায়নের জন্য প্রস্তুত। প্রতিটি আইটেম আলাদা PR-এ করার পরামর্শ রইল, যাতে `AGENTS.md`-এর "ছোট ও নির্দিষ্ট স্কোপ" নীতি রক্ষা হয়।_
