# Offline acceptance tests (T1–T9)

From the handoff spec, tab 05. All must pass on a physical phone before release. The point of T2 is a screenshot: airplane-mode icon + empty network log + working app in one frame.

Preparation: install a development build (or Expo Go), open the app once online so the NWS check and forecast run (Offline data → "Refresh everything now"), and set up a household.

| # | Test | Procedure | Pass criteria |
|---|---|---|---|
| T1 | Cold start offline | Online refresh → force-quit → airplane mode ON → launch | All three tabs render immediately. No spinner, no error dialog. OFFLINE MODE banner visible at the top of every screen. |
| T2 | Zero network calls | In airplane mode, visit all three tabs and every sub-screen (official alert, past notices, household, shelter detail, offline data, FAQ, why-this-number). Record with a proxy (mitmproxy / Charles) or the dev-client network inspector. | Request log is empty. Screenshot it. |
| T3 | Offline write persistence | Airplane mode → check 5 checklist items → force-quit → reboot the phone → launch | All 5 remain checked. Household values unchanged. |
| T4 | Recovery after reconnect | Turn airplane mode OFF, return to the app | Within 60 s the Alert tab shows "NWS checked just now" (Offline data → Alert history row). No duplicate notices in Past notices. |
| T5 | Worst case | Fresh install → immediately airplane mode ON → launch | Onboarding works. Shelter tab shows the bundled list with the red "showing the list that came with the app" card. FAQ opens. Nothing is blank. |
| T6 | Slow network | Throttle to 3G with 20% loss (Network Link Conditioner / emulator) → open app | UI never blocks; cached data renders first; refresh finishes or fails silently. |
| T7 | Interrupted refresh | Start "Refresh everything now", cut the network mid-way | Previously saved data still shown; status line reports failed items; retry works. (v1 has no multi-MB tile download, so partial-file recovery is not applicable.) |
| T8 | Stale data warning | Set the device clock 8 days ahead → open Shelter and Offline data | Amber "older than 7 days" warning appears (only when a downloaded shelter list exists); data still displayed. |
| T9 | Timezone | Run the same demo scenario with the device set to ChST (UTC+10) and to KST (UTC+9) | Countdown target and all "ChST" stamps are identical in both settings. (Also covered by `__tests__/windows-time.test.ts`.) |

## State matrix (S-10) — every screen must handle all six

| State | Expected | Forbidden |
|---|---|---|
| Online · cache present | Render cache → refresh in background → replace quietly | Full-screen spinner |
| Offline · cache present | Render cache + OFFLINE banner + data time stamps | Error dialog, blank screen |
| Offline · no cache | Bundled fallback + "bundled with the app" label + prompt to download | "Check your connection" and nothing else |
| Online · cache expired (7 days+) | Render + amber warning + one-tap refresh | Old data presented as current |
| No alert (calm) | Navy hero + offline-data status + checklist prompt | Fake urgency, empty state |
| Low storage | Keep shelters / map / FAQ, drop forecast and history first, say what was dropped | Silent failure, crash |

## Demo script (judging video)

1. Offline data → Demo & testing → **Before**. Alert tab: storm name, countdown, 72h window, "Do these 3 today" with "Download map & shelters" first.
2. Checklist → household row → change people 4 → 6. "What will change" shows Water 60 L → 84 L. Save; the checklist updates and shows "24 L more needed" on an item already checked.
3. Tap **Why this number?** on water: `4 L × 3 days × 7 people = 84 L` — a multiplication, not AI.
4. Shelter tab: map, distances (GPS works without signal), tap a shelter → landmark directions and the HSEM number.
5. Airplane mode ON → force-quit → relaunch. Every tab still opens; OFFLINE MODE banner shows. This is the whole claim.
6. Demo & testing → **During** → STAY INSIDE screen; then **After** → all-clear screen that explains why network-only features are not there.
