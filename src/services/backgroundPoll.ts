/**
 * Best-effort periodic NWS poll while the app is backgrounded (dev/production builds only;
 * not available in Expo Go on Android, no background execution in Expo Go on iOS, never on web).
 * `defineTask` must run at module scope — this file is imported for its side effect from the root layout.
 */
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { alertRepo } from '@/data/repos';
import { mergeAlerts } from '@/domain/nws';

import { notifyNewAlerts } from './notifications';
import { fetchActiveAlerts } from './nwsClient';

export const ALERT_POLL_TASK = 'nmi-alert-poll';

if (Platform.OS !== 'web') {
  TaskManager.defineTask(ALERT_POLL_TASK, async () => {
    try {
      const features = await fetchActiveAlerts();
      const existing = alertRepo.getAll().filter((a) => !a.isDemo);
      const { alerts, newIds } = mergeAlerts(existing, features);
      alertRepo.replaceAll(alerts);
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
      await BackgroundTask.registerTaskAsync(ALERT_POLL_TASK, { minimumInterval: 15 });
    }
    return true;
  } catch {
    return false;
  }
}
