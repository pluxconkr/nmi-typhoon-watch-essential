/**
 * Demo scenarios for judging and the submission video. Uses real NWS text for Super
 * Typhoon Sinlaku (April 2026) with timestamps shifted relative to "now" so the countdown
 * and phase logic can be shown. Demo alerts are flagged `isDemo` and labelled in the UI.
 */
import demoData from '@/assets/data/demo-alerts.json';
import { alertRepo } from '@/data/repos';
import type { DemoScenario, Severity, StoredAlert } from '@/domain/types';
import { actions, getState } from '@/store/appStore';

interface DemoAlertSeed {
  key: string;
  scenario: 'before' | 'during' | 'after';
  event: string;
  severity: string;
  urgency: string;
  certainty: string;
  areaDesc: string;
  headline: string | null;
  description: string;
  instruction: string | null;
  vtec: string | null;
  sent: string;
  product_id: string;
}

const HOUR = 3600_000;
const DEMO_ID_PREFIX = 'urn:oid:2.49.0.1.840.0.DEMO-';

const iso = (ms: number) => new Date(ms).toISOString();

/** Spec demo: countdown starts at 42h 10m. */
export const DEMO_BEFORE_OFFSET_MS = 42 * HOUR + 10 * 60_000;

function seed(key: string): DemoAlertSeed {
  const s = (demoData.alerts as DemoAlertSeed[]).find((a) => a.key === key);
  if (!s) throw new Error(`demo seed missing: ${key}`);
  return s;
}

function make(s: DemoAlertSeed, times: { sent: number; onset: number | null; ends: number | null; expires: number }, summary: string): StoredAlert {
  return {
    alertId: `${DEMO_ID_PREFIX}${s.key}`,
    event: s.event,
    severity: s.severity as Severity,
    urgency: s.urgency,
    certainty: s.certainty,
    areaDesc: s.areaDesc,
    headline: s.headline,
    description: s.description,
    instruction: s.instruction,
    senderName: 'NWS Tiyan GU',
    sent: iso(times.sent),
    effective: iso(times.sent),
    onset: times.onset === null ? null : iso(times.onset),
    expires: iso(times.expires),
    ends: times.ends === null ? null : iso(times.ends),
    sourceUrl: `https://mesonet.agron.iastate.edu/vtec/#2026-O-NEW-PGUM-TY-W-4004`,
    vtec: s.vtec,
    plainSummary: summary,
    summaryStatus: 'ok',
    summaryAt: iso(times.sent + 2 * 60_000),
    receivedAt: iso(times.sent + 2 * 60_000),
    isDemo: true,
  };
}

/** Build the demo alert set for a scenario, relative to `now`. */
export function buildDemoAlerts(scenario: DemoScenario, now: number = Date.now()): StoredAlert[] {
  if (scenario === 'live' || scenario === 'calm') return [];
  const warning = seed('warning-new');
  const passage = seed('warning-passage');
  const eww = seed('extreme-wind');
  const cancelled = seed('warning-cancelled');

  if (scenario === 'before') {
    const onset = now + DEMO_BEFORE_OFFSET_MS;
    return [
      make(warning, { sent: now - 2 * HOUR, onset, ends: onset + 18 * HOUR, expires: onset + 18 * HOUR }, 'Typhoon force winds reach Saipan Tuesday morning; finish preparing now.'),
    ];
  }
  if (scenario === 'during') {
    const onset = now - 3 * HOUR;
    return [
      make(passage, { sent: now - 40 * 60_000, onset, ends: now + 9 * HOUR, expires: now + 9 * HOUR }, 'Devastating winds over 115 mph hit Tinian and Saipan in the next few hours.'),
      make(eww, { sent: now - 20 * 60_000, onset: now - 20 * 60_000, ends: now + 3 * HOUR, expires: now + 3 * HOUR }, 'The eyewall is 20 miles from Tinian; stay in shelter until 6:15 PM.'),
    ];
  }
  // after: warning ended 20 h ago (inside the 72 h after-window)
  const ended = now - 20 * HOUR;
  return [
    make(cancelled, { sent: ended, onset: null, ends: ended, expires: ended + 6 * HOUR }, 'The Typhoon Warning for Tinian and Saipan is cancelled; hazards remain.'),
    make(passage, { sent: ended - 34 * HOUR, onset: ended - 37 * HOUR, ends: ended, expires: ended }, 'Devastating winds over 115 mph hit Tinian and Saipan in the next few hours.'),
  ];
}

/** Apply a scenario: replace demo alerts in the store (real alerts are kept). */
export function applyDemoScenario(scenario: DemoScenario, now: number = Date.now()): void {
  const real = getState().alerts.filter((a) => !a.isDemo);
  const demo = buildDemoAlerts(scenario, now);
  actions.patchSettings({ demoScenario: scenario });
  actions.setAlerts([...demo, ...real]);
  alertRepo.markNotified(demo.map((a) => a.alertId));
}

export function isDemoActive(): boolean {
  return getState().settings.demoScenario !== 'live';
}
