/**
 * Best-effort periodic NWS poll while the app is backgrounded (dev/production builds only;
 * not available in Expo Go on Android, no background execution in Expo Go on iOS, never on web).
 * The OS wakes the task at most every ~15 minutes; the task then checks only if the Settings
 * interval (automatic: hourly, every 10 min during a storm alert) has passed.
 * `defineTask` must run at module scope — this file is imported for its side effect from the root layout.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { alertRepo, cacheMetaRepo, forecastRepo, settingsRepo } from '@/data/repos';
import { mergeAlerts } from '@/domain/nws';
import { derivePhase } from '@/domain/phase';
import { BACKGROUND_MIN, checkDue, pollMinutes } from '@/domain/polling';
import { nowIso, toEpoch } from '@/domain/time';

import { notifyNewAlerts } from './notifications';
import { fetchActiveAlerts } from './nwsClient';

export const ALERT_POLL_TASK = 'nmi-alert-poll';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(ALERT_POLL_TASK, async () => {
    try {
      const now = Date.now();
      const stored = alertRepo.getAll();
      const minutes = pollMinutes(settingsRepo.get().pollInterval, derivePhase(stored, now, forecastRepo.get()).phase);
      const lastOk = toEpoch(cacheMetaRepo.getAll().alerts?.fetchedAt ?? null);
      if (!checkDue(Number.isFinite(lastOk) ? lastOk : null, minutes, now)) return BackgroundTask.BackgroundTaskResult.Success;
      const features = await fetchActiveAlerts();
      const existing = stored.filter((a) => !a.isDemo);
      const { alerts, newIds } = mergeAlerts(existing, features);
      const kept = alertRepo.replaceAll(alerts);
      cacheMetaRepo.set({ key: 'alerts', fetchedAt: nowIso(), source: 'network', bytes: JSON.stringify(kept).length, version: 'nws-active' });
      if (newIds.length > 0) await notifyNewAlerts(alerts.filter((a) => newIds.includes(a.alertId)));
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function ensureBackgroundPollRegistered(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (!(await TaskManager.isAvailableAsync())) return false;
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    if (!(await TaskManager.isTaskRegisteredAsync(ALERT_POLL_TASK))) {
      await BackgroundTask.registerTaskAsync(ALERT_POLL_TASK, { minimumInterval: BACKGROUND_MIN });
    }
    return true;
  } catch {
    return false;
  }
}
