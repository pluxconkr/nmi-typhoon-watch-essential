# NMI Typhoon Watch

Offline-first typhoon preparedness app for Saipan and the CNMI. Congressional App Challenge 2026 · CNMI At-Large.

**One claim.** On Saipan the alert system does not fail for lack of alerts. It fails because alerts are not translated into what a family should do today, and because when the storm hits there is no power or signal to read them. This app translates each NWS alert into "do these 3 things today" and a household-sized supply list, and keeps all of it on the phone after the network dies.

## What it does (v1)

| Tab / screen | What it shows | Offline? |
|---|---|---|
| **Alert** (home) | Countdown to damaging winds, 72/48/24/6-hour preparation window, exactly 3 tasks for today, one-sentence plain summary of the official alert. Different screens before / during / after the storm and in calm weather. | Yes — last received alert + "received at" time |
| Official alert (S-02) | Unedited NWS Tiyan GU text with full provenance (alert id, issued, received, VTEC). | Yes |
| Past notices (S-03) | Every alert received, newest first. Last 50 or 90 days. | Yes |
| **Checklist** | Water, food, medication, batteries, cash, documents… computed from *your* household by a rules table. "Why this number?" shows the multiplication. | Yes — checks survive restart and power loss |
| Household editor (S-05) | Change people / elders / infants / pets / generator / supply period with a live "60 L → 84 L" preview. | Yes |
| **Shelter** | Vector map of Saipan (OpenStreetMap coastline bundled in the app) with shelter pins and your GPS position, list sorted by straight-line distance, elderly/medical filter. | Yes — zero network requests on this screen |
| Shelter detail (S-07) | Landmark directions written in advance, HSEM phone (tel:), what to bring from your checklist, last-verified date. | Yes |
| Offline data (S-08) | What is saved, how big, and when. Refresh button, notification toggle, demo scenarios, data licences, reset. | Yes |
| What do I do if… (S-09) | Six during-storm situations + after-storm guidance from FEMA / CDC / Red Cross / NWS. 911 and HSEM pinned. | Yes — bundled |

Not in v1 (on purpose): damage reports, volunteer matching, missing-person boards, live shelter capacity, community broadcasts. All of them need a network, and after Sinlaku (April 2026) 52 of Saipan's 74 cell sites were down.

## Where the AI is (and is not)

- **One place:** `src/app/api/summarize+api.ts` — a server-side route that rewrites an official alert into one sentence (15-word target, 20-word hard cap). The key never reaches the phone. Output is validated deterministically (word count, single sentence, every number must appear in the source text; one "shorten it" retry; model reasoning disabled so small models do not leak their chain of thought) and cached with the original text. If the route is missing or fails, the app shows the NWS headline instead.
- **Which provider / model:** [OpenRouter](https://openrouter.ai) — one prepaid key, any vendor. The model is a deployment setting, `SUMMARY_MODEL` (server-side env, OpenRouter slug). Default `anthropic/claude-sonnet-5`; `openai/gpt-5.6-terra`, `google/gemini-3.8-flash` or any other slug work unchanged, and `SUMMARY_FALLBACK_MODELS` lists models to try if the primary is down. Cost is one call per alert id (~2k input + ~40 output tokens), so a full typhoon event costs cents.
- **Nowhere else.** Quantities come from `src/domain/rules.ts` (multiplication table, versioned). The preparation window is four `if` branches. Phase (before / during / after) is derived from NWS alert timestamps and VTEC on the device clock. Severity is passed through from NWS unchanged. Shelter ranking is haversine distance plus filters. No translation, no model training.

## Stack

Expo SDK 57 · expo-router · React Native 0.86 · TypeScript. Local storage is `expo-sqlite/kv-store` (synchronous reads, so the first frame renders from disk) plus `expo-file-system` for downloaded assets; web falls back to localStorage. Map: `react-native-svg` drawing a 400-vertex OSM coastline (≈ 9 KB) — no tiles, no map SDK, no API key. Alerts: `api.weather.gov/alerts/active?area=MP` (public, no key). Wind forecast: Open-Meteo (CC BY 4.0). Local notifications for new alerts; best-effort background polling with `expo-background-task` in development/production builds.

External APIs: 3 · API keys needed by the phone: 0 · Server functions: 1 (the summary route).

## Run it

```bash
npm install
cp .env.example .env        # optional: OPENROUTER_API_KEY (+ SUMMARY_MODEL) for the summary route
npx expo start              # press i / a / w
```

Everything except the one-line AI summary works in Expo Go. For local notifications with a custom channel and background polling, build a development client (`npx expo run:ios` / `npx expo run:android`).

Deploy the summary route (optional): `npx expo export --platform web && eas deploy`, then set the deployed origin in `app.json` (`plugins → expo-router → origin`) or `EXPO_PUBLIC_SUMMARY_URL`.

## Verify

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest: rules table, windows, ChST time, NWS parsing, phase machine, geo, demo scenarios, screen smoke tests
```

Manual offline acceptance procedures (T1–T9 from the handoff spec) are in [docs/QA.md](docs/QA.md).

To compare summary models before picking `SUMMARY_MODEL`: `OPENROUTER_API_KEY=… python3 scripts/bench-summary.py openai/gpt-5.6-luna meta-llama/llama-4-scout` (latency, word count, cost and validation on the four real Sinlaku alerts).

## Build, deploy, release

Identifiers: iOS `com.27363.nmityphoonwatch`, Android `com.tstst.nmityphoonwatch` (see `app.json`). Profiles live in `eas.json`. Commands below use EAS CLI 16 or newer (`npm i -g eas-cli`).

**1. Link the project (once)**

```sh
eas login
eas init            # writes extra.eas.projectId into app.json
```

**2. Deploy the summary route** (the only server code: `src/app/api/summarize+api.ts`). EAS Hosting reads server variables from the EAS environment, not from `.env.local`, and cannot use `secret` visibility, so the key is stored as `sensitive`.

```sh
eas env:set --name OPENROUTER_API_KEY --value <key> --environment production --visibility sensitive
eas env:set --name SUMMARY_MODEL --value meta-llama/llama-4-scout --environment production --visibility plaintext
eas env:set --name SUMMARY_FALLBACK_MODELS --value google/gemini-3.8-flash,openai/gpt-5.6-terra --environment production --visibility plaintext

npx expo export --platform web
eas deploy --prod --environment production      # prints https://<name>.expo.app
```

Check it: `curl https://<name>.expo.app/api/summarize` should answer `{"configured":true,...}`.

**3. Point the app at it.** `EXPO_PUBLIC_*` values are inlined into the app at build time.

```sh
eas env:set --name EXPO_PUBLIC_SUMMARY_URL --value https://<name>.expo.app/api/summarize --environment production --visibility plaintext
# optional HSEM shelter feed (JSON shaped like assets/data/shelters.json)
eas env:set --name EXPO_PUBLIC_SHELTERS_URL --value https://<host>/cnmi-shelters.json --environment production --visibility plaintext
```

Repeat step 3 with `--environment preview` and `--environment development` for those profiles.

**4. Builds**

```sh
eas build --profile development --platform ios            # dev build for a real iPhone (background task, notifications, T1–T9)
eas build --profile development-simulator --platform ios  # same, for the iOS Simulator
eas build --profile preview --platform android            # installable APK
eas build --profile production --platform all             # store builds, version auto-incremented
eas submit --profile production --platform ios            # TestFlight / App Store
eas submit --profile production --platform android        # Play Console
```

Once `expo-dev-client` is installed, `npx expo start` opens development builds by default. Use `npx expo start --go` to keep using Expo Go.

## Demo scenarios

Offline data → **Demo & testing** → Before / During / After. These load the real NWS Tiyan GU text for Super Typhoon Sinlaku (12–17 April 2026, recovered from the IEM VTEC archive) with timestamps shifted to "now", so the countdown, window logic and phase screens can be shown at any time. Demo notices are labelled everywhere they appear. "Simulate no signal" shows the OFFLINE banner and blocks all network calls inside the app; the real test is airplane mode.

## Data and licences

- Alerts: National Weather Service (public domain). Sender for CNMI is **NWS Tiyan GU** (WFO GUM); Saipan is forecast zone MPZ003 / county MPC110; timezone `Pacific/Saipan` (ChST, UTC+10, no DST).
- Wind forecast: [Weather data by Open-Meteo.com](https://open-meteo.com/), CC BY 4.0, non-commercial use.
- Map data: © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright. The simplified coastline in `assets/data/` is a derivative database and stays under ODbL.
- Village points: OpenStreetMap; Chalan Laulau and Fina Sisu from GeoNames.org (CC BY 4.0); As Teo from Wikidata (CC0).
- Shelters: 17 facilities (12 Saipan, 3 Tinian, 2 Rota) from CNMI HSEM bulletins #2/#3 (April 2026), JIC SITREPs (April–May 2026) and the HSEM Bavi release (July 2026); evidence trail in [docs/shelter-sources.md](docs/shelter-sources.md). Design capacity is a planning number from press excerpts, not live availability. CNMI public shelters accept only certified service animals. Water points: 13 CUC / FEMA / JIC sites from the Sinlaku and Bavi responses.
- Guidance text: FEMA / Ready.gov, CDC, American Red Cross, NWS. Sources are cited per entry in `assets/data/faq.json` and per rule in `src/domain/rules.ts`.

## Project layout

```
src/app/            expo-router screens (+ api/summarize+api.ts server route)
src/domain/         pure logic: types, rules table, windows, phase, NWS parsing, time (ChST), geo
src/data/           local storage (kv + files, with .web.ts fallbacks) and repositories
src/services/       network state, NWS + Open-Meteo clients, refresh orchestration, notifications, GPS, background poll, demo
src/store/          useSyncExternalStore app store + derived hooks
src/ui/             theme tokens, primitives, alert widgets, SVG island map
assets/data/        bundled fallbacks: shelters, FAQ, water points, coastline, villages, demo alerts
__tests__/          unit + screen smoke tests (jest-expo)
docs/QA.md          offline acceptance procedures T1–T9
```
