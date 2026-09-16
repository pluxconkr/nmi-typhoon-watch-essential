/**
 * Local notifications for newly received alerts. Zero network. Sound only for Extreme/Severe.
 * Web: no-op (expo-notifications has no web implementation).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { alertRepo } from '@/data/repos';
import type { StoredAlert } from '@/domain/types';
import { getState } from '@/store/appStore';

export const CHANNEL_ID = 'typhoon-alerts';
let configured = false;

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'web' || configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        const loud = n.request.content.data?.loud === true;
        return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: loud, shouldSetBadge: false };
      },
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Typhoon alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C1121F',
        sound: 'default',
      });
    }
  } catch {
    /* notifications unavailable (e.g. simulator restrictions) */
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted || cur.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    if (!cur.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

/** Fire one local notification per alert not yet notified. */
export async function notifyNewAlerts(alerts: StoredAlert[]): Promise<void> {
  if (Platform.OS === 'web' || alerts.length === 0) return;
  if (!getState().settings.notificationsEnabled) return;
  const done = new Set(alertRepo.getNotifiedIds());
  const fresh = alerts.filter((a) => !done.has(a.alertId) && !a.isDemo);
  if (fresh.length === 0) return;
  await configureNotifications();
  const allowed = await ensurePermission();
  alertRepo.markNotified(fresh.map((a) => a.alertId));
  if (!allowed) return;
  for (const a of fresh) {
    const loud = a.severity === 'Extreme' || a.severity === 'Severe';
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: a.event,
          body: a.plainSummary ?? a.headline ?? a.areaDesc,
          data: { alertId: a.alertId, loud },
          sound: loud ? 'default' : undefined,
          ...(Platform.OS === 'ios' ? { interruptionLevel: loud ? ('timeSensitive' as const) : ('active' as const) } : {}),
        },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
      });
    } catch {
      /* ignore */
    }
  }
}
