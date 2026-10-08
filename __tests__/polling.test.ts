/**
 * Alert polling: automatic = hourly, every 10 minutes from Before until the storm alert ends; fixed rates;
 * and the foreground "is a check due?" decision (based on the last successful NWS check, persisted).
 */
import { AUTO_CALM_MIN, AUTO_STORM_MIN, checkDue, describeEvery, pollMinutes } from '@/domain/polling';
import { applyDemoScenario } from '@/services/demo';
import { currentPollMinutes, refreshIfDue } from '@/services/refresh';
import { actions, hydrate, setState } from '@/store/appStore';

describe('poll interval rules', () => {
  test('automatic is hourly in calm weather and after the storm, every 10 minutes in Before and During', () => {
    expect(pollMinutes('auto', 'none')).toBe(AUTO_CALM_MIN);
    expect(pollMinutes('auto', 'after')).toBe(AUTO_CALM_MIN);
    expect(pollMinutes('auto', 'before')).toBe(AUTO_STORM_MIN);
    expect(pollMinutes('auto', 'during')).toBe(AUTO_STORM_MIN);
    expect(AUTO_CALM_MIN).toBe(60);
    expect(AUTO_STORM_MIN).toBe(10);
  });

  test('a fixed choice ignores the storm phase', () => {
    for (const m of [5, 10, 15, 30, 60] as const) {
      expect(pollMinutes(m, 'before')).toBe(m);
      expect(pollMinutes(m, 'none')).toBe(m);
    }
    expect(describeEvery(60)).toBe('Every hour');
    expect(describeEvery(5)).toBe('Every 5 minutes');
  });

  test('a check is due when never checked or the interval has passed', () => {
    const now = Date.UTC(2026, 9, 7, 2, 0);
    expect(checkDue(null, 60, now)).toBe(true);
    expect(checkDue(now - 59 * 60_000, 60, now)).toBe(false);
    expect(checkDue(now - 60 * 60_000, 60, now)).toBe(true);
    expect(checkDue(now - 11 * 60_000, 10, now)).toBe(true);
  });
});

describe('foreground schedule', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch' as never).mockImplementation((() => Promise.reject(new Error('offline in test'))) as never);
  afterAll(() => fetchSpy.mockRestore());

  beforeEach(() => {
    hydrate();
    actions.patchSettings({ pollInterval: 'auto', simulateOffline: false });
    setState({ network: { online: true, type: 'WIFI' }, lastRefreshAt: null });
    fetchSpy.mockClear();
  });

  const checkedMinutesAgo = (min: number) =>
    setState({ cacheMeta: { alerts: { key: 'alerts', fetchedAt: new Date(Date.now() - min * 60_000).toISOString(), source: 'network', bytes: 2, version: 'nws-active' } } });

  test('automatic: 20 minutes after the last check nothing happens in calm weather', async () => {
    applyDemoScenario('live');
    checkedMinutesAgo(20);
    expect(currentPollMinutes()).toBe(60);
    expect(await refreshIfDue()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('automatic: once a storm alert is in Before, a check 20 minutes old is due', async () => {
    applyDemoScenario('before');
    checkedMinutesAgo(20);
    expect(currentPollMinutes()).toBe(10);
    await refreshIfDue();
    expect(fetchSpy).toHaveBeenCalled();
    applyDemoScenario('live');
  });

  test('a fixed 30-minute choice waits 30 minutes, and a just-failed attempt is not retried at once', async () => {
    actions.patchSettings({ pollInterval: 30 });
    checkedMinutesAgo(20);
    expect(await refreshIfDue()).toBeNull();
    checkedMinutesAgo(31);
    setState({ lastRefreshAt: Date.now() - 30_000 });
    expect(await refreshIfDue()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
