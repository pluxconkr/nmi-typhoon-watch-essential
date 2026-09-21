/**
 * S-10 "low storage": when a write fails because the phone is full, the app gives up
 * re-downloadable data by priority (forecast → older notices), retries, and says what it dropped.
 * Household and checklist data are never dropped.
 */
import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { KEYS, LOW_SPACE_ALERT_KEEP, alertRepo, checklistRepo, forecastRepo, householdRepo, onStorageNotice, storageNoticeRepo } from '@/data/repos';
import { kv } from '@/data/kv';
import { DEFAULT_HOUSEHOLD } from '@/domain/rules';
import type { StorageNotice, StoredAlert, WindForecast } from '@/domain/types';

const alert = (i: number): StoredAlert => ({ alertId: `a${i}`, receivedAt: new Date(Date.now() - i * 60_000).toISOString() }) as unknown as StoredAlert;
const forecast = { fetchedAt: new Date().toISOString(), hours: [] } as unknown as WindForecast;

/** Make writes to `key` fail `times` times with a disk-full error, then behave normally. */
function failWrites(key: string, times: number) {
  const orig = SQLiteStorage.prototype.setItemSync;
  let left = times;
  return jest.spyOn(SQLiteStorage.prototype, 'setItemSync').mockImplementation(function (this: SQLiteStorage, k: string, v: Parameters<SQLiteStorage['setItemSync']>[1]) {
    if (k === key && left > 0) {
      left -= 1;
      throw new Error('database or disk is full');
    }
    return orig.call(this, k, v);
  });
}

describe('storage guard', () => {
  let notices: StorageNotice[];

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // failed writes warn in dev builds
    kv.clear();
    notices = [];
    onStorageNotice((n) => notices.push(n));
    forecastRepo.set(forecast);
    alertRepo.replaceAll(Array.from({ length: 25 }, (_, i) => alert(i)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    onStorageNotice(null);
  });

  test('a full disk drops the forecast and older notices, then the checklist write succeeds', () => {
    const spy = failWrites(KEYS.checklist, 1);
    const next = checklistRepo.toggle('water', true, 60, 'L', new Date().toISOString());
    spy.mockRestore();

    expect(next.water.done).toBe(true);
    expect(checklistRepo.getAll().water.done).toBe(true); // reached disk on the retry
    expect(forecastRepo.get()).toBeNull();
    expect(alertRepo.getAll()).toHaveLength(LOW_SPACE_ALERT_KEEP);
    expect(alertRepo.getAll()[0].alertId).toBe('a0'); // newest kept
    expect(notices).toHaveLength(1);
    expect(notices[0].dropped).toEqual(['forecast', 'alert-history']);
    expect(notices[0].recovered).toBe(true);
    expect(storageNoticeRepo.get()?.dropped).toEqual(['forecast', 'alert-history']);
  });

  test('if the retry also fails the UI still gets the new state and the notice says it was not saved', () => {
    failWrites(KEYS.household, 2);
    const saved = householdRepo.set({ ...DEFAULT_HOUSEHOLD, people: 6 });
    expect(saved.people).toBe(6);
    expect(notices.at(-1)?.recovered).toBe(false);
  });

  test('a forecast that cannot be written is reported, not retried, and nothing else is dropped', () => {
    kv.remove(KEYS.forecast);
    failWrites(KEYS.forecast, 5);
    expect(forecastRepo.set(forecast)).toBe(false);
    expect(alertRepo.getAll()).toHaveLength(25);
    expect(notices.at(-1)?.dropped).toEqual(['forecast']);
  });

  test('new notices written while full are trimmed to the newest ones', () => {
    failWrites(KEYS.alerts, 1);
    const kept = alertRepo.replaceAll(Array.from({ length: 30 }, (_, i) => alert(i)));
    expect(kept).toHaveLength(LOW_SPACE_ALERT_KEEP);
    expect(alertRepo.getAll()).toHaveLength(LOW_SPACE_ALERT_KEEP);
  });
});
