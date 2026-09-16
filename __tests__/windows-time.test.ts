import { AFTER_TASKS, DURING_TASKS, WINDOWS, WINDOW_TASKS, windowFor } from '@/domain/windows';
import {
  CHST_OFFSET_MS,
  deviceIsChst,
  formatChst,
  formatChstDate,
  formatChstShort,
  formatChstStamp,
  formatCountdown,
  isStale,
  relativeAgo,
  toEpoch,
} from '@/domain/time';

describe('preparation windows', () => {
  test('hours → window boundaries', () => {
    expect(windowFor(72)).toBe('72h');
    expect(windowFor(48.01)).toBe('72h');
    expect(windowFor(48)).toBe('48h');
    expect(windowFor(24.01)).toBe('48h');
    expect(windowFor(24)).toBe('24h');
    expect(windowFor(6.01)).toBe('24h');
    expect(windowFor(6)).toBe('6h');
    expect(windowFor(0)).toBe('6h');
    expect(windowFor(-3)).toBe('6h');
  });

  test('exactly three tasks per window, during and after', () => {
    for (const w of WINDOWS) expect(WINDOW_TASKS[w]).toHaveLength(3);
    expect(DURING_TASKS).toHaveLength(3);
    expect(AFTER_TASKS).toHaveLength(3);
  });

  test('task ids are unique across all lists', () => {
    const ids = [...WINDOWS.flatMap((w) => WINDOW_TASKS[w].map((t) => t.id)), ...DURING_TASKS.map((t) => t.id), ...AFTER_TASKS.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('the 72h window tells people to download while they still have signal', () => {
    expect(WINDOW_TASKS['72h'][0].title).toMatch(/download/i);
  });
});

describe('ChST time formatting (T9: same instant on any device timezone)', () => {
  // NWS sends offsets explicitly. 2026-09-07T08:00:00+10:00 == 2026-09-06T22:00:00Z
  const nwsOnset = '2026-09-07T08:00:00+10:00';
  const utcSame = '2026-09-06T22:00:00Z';

  test('toEpoch treats +10:00 and Z forms of the same instant identically', () => {
    expect(toEpoch(nwsOnset)).toBe(toEpoch(utcSame));
    expect(toEpoch('garbage')).toBeNaN();
    expect(toEpoch(null)).toBeNaN();
    expect(toEpoch(1234)).toBe(1234);
  });

  test('formatChst renders ChST wall-clock regardless of the input offset', () => {
    expect(formatChst(nwsOnset)).toBe('Mon 07 Sep 08:00 ChST');
    expect(formatChst(utcSame)).toBe('Mon 07 Sep 08:00 ChST');
    expect(formatChstShort(utcSame)).toBe('Mon 08:00 ChST');
    expect(formatChstStamp(utcSame)).toBe('2026-09-07 08:00 ChST');
    expect(formatChstDate(utcSame)).toBe('2026-09-07');
    expect(formatChst('nope')).toBe('—');
  });

  test('date rollover near midnight ChST', () => {
    // 2026-09-06T14:30:00Z = 2026-09-07 00:30 ChST
    expect(formatChstStamp('2026-09-06T14:30:00Z')).toBe('2026-09-07 00:30 ChST');
    expect(formatChstStamp('2026-09-06T13:59:00Z')).toBe('2026-09-06 23:59 ChST');
  });

  test('CHST offset is +10h exactly and deviceIsChst is a pure offset check', () => {
    expect(CHST_OFFSET_MS).toBe(36_000_000);
    expect(typeof deviceIsChst()).toBe('boolean');
  });

  test('countdown formatting', () => {
    expect(formatCountdown((42 * 3600 + 10 * 60 + 5) * 1000)).toBe('42h 10m 05s');
    expect(formatCountdown(0)).toBe('0h 00m 00s');
    expect(formatCountdown(-5000)).toBe('0h 00m 00s');
  });

  test('relativeAgo', () => {
    const now = toEpoch('2026-09-14T12:00:00Z');
    expect(relativeAgo('2026-09-14T11:59:40Z', now)).toBe('just now');
    expect(relativeAgo('2026-09-14T11:55:00Z', now)).toBe('5 min ago');
    expect(relativeAgo('2026-09-14T09:00:00Z', now)).toBe('3 hours ago');
    expect(relativeAgo('2026-09-12T11:00:00Z', now)).toBe('2 days ago');
    expect(relativeAgo(null, now)).toBe('never');
  });

  test('isStale after 7 days (T8)', () => {
    const now = toEpoch('2026-09-14T12:00:00Z');
    expect(isStale('2026-09-08T12:00:00Z', now)).toBe(false);
    expect(isStale('2026-09-06T11:00:00Z', now)).toBe(true);
    expect(isStale(null, now)).toBe(true);
  });
});
