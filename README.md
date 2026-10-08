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
| **Shelter** | Vector maps of Saipan, Tinian and Rota (OpenStreetMap coastlines bundled in the app) with shelter pins and your live GPS position, opening on the island you are on. Nearest shelter **by road** with one-tap navigation; shelters ranked by road time; elderly/medical filter. | Yes — zero network requests on this screen |
| Shelter detail (S-07) | Drive / walk time by road with Start navigation, supply stores within 3 km, landmark directions written in advance, HSEM phone (tel:), what to bring, last-verified date. | Yes |
| Navigation (full screen) | Turn-by-turn on the bundled OSM road network: next maneuver, distance and time left, live position, re-routes when you leave the route, arrival. Drive or walk. | Yes — routing runs on the phone |
| Where to buy supplies | Groceries, pharmacies, hardware stores and gas stations, ranked by road time from you, each with its verification sources; directions to any of them. | Yes — bundled |
| Settings | How often to check NWS (Automatic = hourly, every 10 min from Before until a storm alert ends; or 5 / 10 / 15 / 30 / 60 min), notifications, demo scenarios, demo GPS position. | Yes |
| Offline data (S-08) | What is saved, how big, and when. Refresh button with progress, low-storage notice, data licences, reset. | Yes |
| What do I do if… (S-09) | Six during-storm situations + after-storm guidance from FEMA / CDC / Red Cross / NWS. 911 and HSEM pinned. | Yes — bundled |

Not in v1 (on purpose): damage reports, volunteer matching, missing-person boards, live shelter capacity, community broadcasts. All of them need a network, and after Sinlaku (April 2026) 52 of Saipan's 74 cell sites were down.

## Where the AI is (and is not)

- **One place:** `src/app/api/summarize+api.ts` — a server-side route that rewrites an official alert into one sentence (15-word target, 20-word hard cap). The key never reaches the phone. Output is validated deterministically (word count, single sentence, every number must appear in the source text; one "shorten it" retry; model reasoning disabled so small models do not leak their chain of thought) and cached with the original text. If the route is missing or fails, the app shows the NWS headline instead.
- **Which provider / model:** [OpenRouter](https://openrouter.ai) — one prepaid key, any vendor. The model is a deployment setting, `SUMMARY_MODEL` (server-side env, OpenRouter slug). Default `anthropic/claude-sonnet-5`; `openai/gpt-5.6-terra`, `google/gemini-3.8-flash` or any other slug work unchanged, and `SUMMARY_FALLBACK_MODELS` lists models to try if the primary is down. Cost is one call per alert id (~2k input + ~40 output tokens), so a full typhoon event costs cents.
- **Nowhere else.** Quantities come from `src/domain/rules.ts` (multiplication table, versioned). The preparation window is four `if` branches. Phase (before / during / after) is derived from NWS alert timestamps and VTEC on the device clock. Severity is passed through from NWS unchanged. Shelter ranking and directions are a shortest-path search (Dijkstra on travel time) over the bundled road graph, on the phone. No translation, no model training.

## Stack

Expo SDK 57 · expo-router · React Native 0.86 · TypeScript. Local storage is `expo-sqlite/kv-store` (synchronous reads, so the first frame renders from disk) plus `expo-file-system` for downloaded assets; web falls back to localStorage. Map: `react-native-svg` drawing simplified OSM coastlines and, for navigation, the OSM road network of each island (Saipan 5.5k intersections / 659 km of road in 240 KB; Tinian and Rota ≈ 40 KB each, built by `scripts/build-roads.py`) — no tiles, no map SDK, no API key, routing on the device. Alerts: `api.weather.gov/alerts/active?area=MP` (public, no key). Wind forecast: Open-Meteo (CC BY 4.0). Local notifications for new alerts; best-effort background polling with `expo-background-task` in development/production builds.

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
eas submit --profile production --platform android        # Play Console, internal testing track
```

**5. Test distribution**

- iOS → TestFlight: `eas build -p ios --profile production --auto-submit`. The first time, EAS signs in with your Apple ID, creates the signing certificate and profile, and creates the app record in App Store Connect if it does not exist. The build then appears under TestFlight → Internal Testing; add testers in App Store Connect.
- Android → Play internal testing: build with `eas build -p android --profile production` (an `.aab`), create the app in Play Console and **upload that first `.aab` by hand** to Internal testing (Google requires the first upload to be manual). After that, put a Play service-account JSON at `google-play-service-account.json` (gitignored) and `eas submit -p android --latest` uploads to the internal track automatically.
- Build numbers are managed on EAS (`appVersionSource: remote`, `autoIncrement: true` on the production profile); bump `expo.version` in `app.json` only for a new marketing version.

Once `expo-dev-client` is installed, `npx expo start` opens development builds by default. Use `npx expo start --go` to keep using Expo Go.

## Demo scenarios

Offline data → **Demo & testing** → Before / During / After. These load the real NWS Tiyan GU text for Super Typhoon Sinlaku (12–17 April 2026, recovered from the IEM VTEC archive) with timestamps shifted to "now", so the countdown, window logic and phase screens can be shown at any time. Demo notices are labelled everywhere they appear. "Simulate no signal" shows the OFFLINE banner and blocks all network calls inside the app; the real test is airplane mode.

Deep links do the same from a terminal or a test script, e.g. `nmityphoonwatch://?demo=before` (also `during`, `after`, `live`), `nmityphoonwatch://shelter?island=tinian` (also `saipan`, `rota`) and `nmityphoonwatch://navigate?to=nearest-shelter` (also `shelter:<id>`, `store:<id>`, `&mode=walk`).

**Directions away from the islands.** Settings → Demo GPS position puts a labelled position in Garapan, Koblerville, Kagman, San Jose (Tinian) or Songsong (Rota) instead of GPS. On the iOS Simulator you can also drive a route for real: `xcrun simctl location booted start --speed=20 - < waypoints.txt` (one `lat,lng` per line). On the iOS Simulator with Metro running: `xcrun simctl openurl booted "exp://127.0.0.1:8081/--/shelter?island=rota"`.

Note: Expo Go asks for notification permission on its own when a project uses expo-notifications. The app itself only asks the first time a real NWS alert arrives (and never when "Notify me about new NWS alerts" is off), which is what a development build shows.

## Data and licences

- Alerts: National Weather Service (public domain). Sender for CNMI is **NWS Tiyan GU** (WFO GUM); Saipan is forecast zone MPZ003 / county MPC110; timezone `Pacific/Saipan` (ChST, UTC+10, no DST).
- Wind forecast: [Weather data by Open-Meteo.com](https://open-meteo.com/), CC BY 4.0, non-commercial use.
- Map data: © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright. The simplified coastlines and the road graphs (`assets/data/roads-*.json`, rebuilt with `python3 scripts/build-roads.py`) are derivative databases and stay under ODbL; attribution is shown on every map, including navigation.
- Village points: OpenStreetMap; Chalan Laulau and Fina Sisu from GeoNames.org (CC BY 4.0); As Teo from Wikidata (CC0).
- Shelters: 17 facilities (12 Saipan, 3 Tinian, 2 Rota), re-checked on 7 Oct 2026 against the latest official list — the CNMI JIC releases for Super Typhoon Bavi (2–5 Jul 2026; no shelter list was issued for Tropical Storm Choi-wan). 10 are **current** (on the Bavi list) and 7 were used only in earlier storms; directions to the "nearest shelter" only ever pick current ones, and earlier-storm shelters say "call HSEM first". **Medical support** marks the four shelters the JIC named on 5 Jul 2026 for residents needing medical support (Kagman Community Center, Tinian Middle and High School, Rota Aging Office, Dr. Rita Hocog Inos Jr./Sr. High School). The Saipan Office on Aging (Man'amko' Center) carries a damage warning (roof and windows lost in Sinlaku). The Rota high-school pin was moved 1.2 km off the former Rota High School building (now DLNR offices). Evidence trail: [docs/shelter-sources.md](docs/shelter-sources.md). Design capacity is a planning number, not live availability. CNMI public shelters accept only certified service animals. Water points: 13 CUC / FEMA / JIC sites from the Sinlaku and Bavi responses.
- Supply stores: groceries, convenience stores, pharmacies, hardware stores and gas stations on all three islands, researched against 2025–26 sources (Mobil and IP&E station lists, CNMI JIC lists of open businesses after Sinlaku, CHCC food-inspection and WIC lists, CNMI Medicaid and federal EPAP pharmacy lists, news). Every record cites its sources; evidence trail in [docs/supply-sources.md](docs/supply-sources.md), rebuilt with `python3 scripts/build-supplies.py`. Left out: stores found closed, stores with no published location, and stores that are neither confirmed open nor precisely located. Stores known only by village are listed by village without a distance, and directions to them say they go to the village centre.
- Guidance text: FEMA / Ready.gov, CDC, American Red Cross, NWS. Sources are cited per entry in `assets/data/faq.json` and per rule in `src/domain/rules.ts`.

## Project layout

```
src/app/            expo-router screens (+ api/summarize+api.ts server route)
src/domain/         pure logic: types, rules table, windows, phase, NWS parsing, time (ChST), geo, roads + routing, polling, supplies
src/data/           local storage (kv + files, with .web.ts fallbacks) and repositories
src/services/       network state, NWS + Open-Meteo clients, refresh orchestration, notifications, GPS, navigation session, background poll, demo
src/store/          useSyncExternalStore app store + derived hooks
src/ui/             theme tokens, primitives, alert widgets, SVG island map, navigation map
assets/data/        bundled data: shelters, supply stores, FAQ, water points, coastlines, road graphs, villages, demo alerts
scripts/            build-roads.py (OSM → road graphs), build-supplies.py (verified records → supplies.json), bench-summary.py
__tests__/          unit + screen smoke tests (jest-expo)
docs/QA.md          offline acceptance procedures T1–T9
```
