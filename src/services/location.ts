/**
 * GPS works without a signal (satellites, not cell towers). Permission is asked once; the last
 * known fix renders instantly, a fresh fix refines it, and screens that need it get live updates
 * while they are focused. A labelled demo position can stand in for GPS (Settings → Demo GPS position).
 */
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { demoPositionFix } from '@/domain/demoPositions';
import type { DemoPositionId, LocationFix } from '@/domain/types';
import { actions, getState, useAppState } from '@/store/appStore';

/** browse = map and lists (saves battery); navigate = turn-by-turn (every second, best accuracy). */
export type WatchMode = 'browse' | 'navigate';

const FIX_TIMEOUT_MS = 20_000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000;

// mayShowUserSettingsDialog: Android would otherwise ask to turn on "improved accuracy" (Wi-Fi and cell
// networks) every time a GPS screen opens, and treat "No thanks" as a failure — satellites alone are enough.
const WATCH_OPTIONS: Record<WatchMode, Location.LocationOptions> = {
  browse: { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5_000, mayShowUserSettingsDialog: false },
  navigate: { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 2, timeInterval: 1_000, mayShowUserSettingsDialog: false },
};

function toFix(l: Location.LocationObject): LocationFix {
  const { latitude, longitude, accuracy, heading, speed } = l.coords;
  return {
    lat: latitude,
    lng: longitude,
    accuracyM: accuracy ?? null,
    at: l.timestamp,
    heading: heading != null && heading >= 0 ? heading : null,
    speed: speed != null && speed >= 0 ? speed : null,
  };
}

function demoFix(): LocationFix | null {
  const id = getState().settings.demoPosition;
  return id ? demoPositionFix(id) : null;
}

async function permissionGranted(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/**
 * Location Services on and permission granted; otherwise records why not and drops the earlier fix, which is
 * no longer where you are. Services are checked first: with them off, iOS reports the permission as denied.
 */
async function gpsReady(): Promise<boolean> {
  if (Platform.OS !== 'web' && !(await Location.hasServicesEnabledAsync())) {
    actions.loseLocation('off');
    return false;
  }
  if (!(await permissionGranted())) {
    actions.loseLocation('denied');
    return false;
  }
  // Allowed again since the last check (e.g. in the system Settings app): the old reason no longer applies.
  const status = getState().locationStatus;
  if (status === 'denied' || status === 'off' || status === 'unavailable') actions.setLocationStatus(getState().location ? 'granted' : 'requesting');
  return true;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Status to show after GPS gave up: keep a real earlier fix usable, otherwise say there is none. */
function settleWithoutFix() {
  const had = getState().location;
  actions.setLocationStatus(had && !had.demo ? 'granted' : 'unavailable');
}

/** One-shot fix: the last known position immediately, then a fresh one. Never throws. */
export async function acquireLocation(): Promise<LocationFix | null> {
  const demo = demoFix();
  if (demo) {
    actions.setLocation(demo, 'granted');
    return demo;
  }
  actions.setLocationStatus('requesting');
  try {
    if (!(await gpsReady())) return null;
    if (Platform.OS !== 'web') {
      const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS, requiredAccuracy: 200 });
      if (last) actions.setLocation(toFix(last), 'requesting');
    }
    const current = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false }), FIX_TIMEOUT_MS);
    if (current) {
      const fix = toFix(current);
      actions.setLocation(fix, 'granted');
      return fix;
    }
    settleWithoutFix();
    return getState().location;
  } catch {
    settleWithoutFix();
    return null;
  }
}

/** Start live GPS updates into the store. Resolves to a stop function. Never throws. */
export async function startLocationWatch(mode: WatchMode): Promise<() => void> {
  const noop = () => {};
  const demo = demoFix();
  if (demo) {
    actions.setLocation(demo, 'granted');
    return noop;
  }
  try {
    if (!getState().location || getState().location?.demo) actions.setLocationStatus('requesting');
    if (!(await gpsReady())) return noop;
    const sub = await Location.watchPositionAsync(WATCH_OPTIONS[mode], (l) => actions.setLocation(toFix(l), 'granted'), settleWithoutFix);
    return () => sub.remove();
  } catch {
    settleWithoutFix();
    return noop;
  }
}

/** Live GPS while the calling screen is focused; stops when it loses focus. */
export function useLiveLocation(mode: WatchMode, enabled = true) {
  const demoId = useAppState((s) => s.settings.demoPosition);
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      const demo = demoId ? demoPositionFix(demoId) : null;
      if (demo) {
        actions.setLocation(demo, 'granted');
        return undefined;
      }
      let stop: (() => void) | null = null;
      let cancelled = false;
      const start = () =>
        void startLocationWatch(mode).then((s) => {
          if (cancelled) s();
          else stop = s;
        });
      start();
      // Back from the system Settings app with location turned on: start again instead of waiting for a re-visit.
      const sub = AppState.addEventListener('change', (next) => {
        const status = getState().locationStatus;
        if (next !== 'active' || !(status === 'denied' || status === 'off' || status === 'unavailable')) return;
        stop?.();
        stop = null;
        start();
      });
      return () => {
        cancelled = true;
        sub.remove();
        stop?.();
      };
    }, [mode, enabled, demoId]),
  );
}

/** Switch the demo position on (a village) or off (back to GPS). */
export function setDemoPosition(id: DemoPositionId | null) {
  if (id === getState().settings.demoPosition) return;
  actions.patchSettings({ demoPosition: id });
  if (id) {
    const fix = demoPositionFix(id);
    if (fix) actions.setLocation(fix, 'granted');
    return;
  }
  actions.clearLocation();
  void acquireLocation();
}

/** The app's page in the system Settings (to turn location permission back on). */
export function openAppSettings() {
  void Linking.openSettings().catch(() => {});
}

/** Where Location Services are switched on: Android's location page; on iOS the app's page is the closest link. */
export function openLocationSettings() {
  if (Platform.OS === 'android') void Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(openAppSettings);
  else openAppSettings();
}
