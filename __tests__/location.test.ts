/**
 * GPS states: Location Services and permission are checked in the right order, an earlier fix is dropped when
 * GPS becomes unavailable, a later grant clears the old reason, Android's accuracy dialog is never forced, and a
 * demo position is not replaced by a late GPS answer.
 */
import * as Location from 'expo-location';

import { ISLAND_NAME, islandAt } from '@/domain/geo';
import { DEMO_POSITION_IDS, demoPositionFix, demoPositionLabel } from '@/domain/demoPositions';
import type { LocationFix } from '@/domain/types';
import { acquireLocation, setDemoPosition, startLocationWatch } from '@/services/location';
import { actions, getState, hydrate, setState } from '@/store/appStore';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4, BestForNavigation: 6 },
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const L = Location as jest.Mocked<typeof Location>;
const granted = { granted: true, canAskAgain: true } as Location.LocationPermissionResponse;
const refused = { granted: false, canAskAgain: false } as Location.LocationPermissionResponse;
const OLD_FIX: LocationFix = { lat: 15.2069, lng: 145.7196, accuracyM: 5, at: Date.now() - 3 * 86_400_000, heading: null, speed: null };

beforeEach(() => {
  hydrate();
  actions.patchSettings({ demoPosition: null });
  setState({ location: null, locationStatus: 'idle' });
  jest.clearAllMocks();
  L.hasServicesEnabledAsync.mockResolvedValue(true);
  L.getForegroundPermissionsAsync.mockResolvedValue(granted);
  L.requestForegroundPermissionsAsync.mockResolvedValue(granted);
  L.getLastKnownPositionAsync.mockResolvedValue(null);
  L.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 15.15, longitude: 145.71, accuracy: 8, altitude: null, altitudeAccuracy: null, heading: -1, speed: -1 }, timestamp: Date.now() });
  L.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });
});

test('Location Services off: reported as off (not as the permission), and the earlier fix is dropped', async () => {
  setState({ location: OLD_FIX, locationStatus: 'granted' });
  L.hasServicesEnabledAsync.mockResolvedValue(false);
  L.getForegroundPermissionsAsync.mockResolvedValue(refused); // what iOS reports while Location Services are off
  await acquireLocation();
  expect(getState().locationStatus).toBe('off');
  expect(getState().location).toBeNull();
});

test('permission refused: the earlier fix is dropped, not shown as where you are', async () => {
  setState({ location: OLD_FIX, locationStatus: 'granted' });
  L.getForegroundPermissionsAsync.mockResolvedValue(refused);
  await startLocationWatch('browse');
  expect(getState().locationStatus).toBe('denied');
  expect(getState().location).toBeNull();
  expect(L.watchPositionAsync).not.toHaveBeenCalled();
});

test('allowed again later: the old reason is cleared as soon as GPS starts', async () => {
  setState({ location: null, locationStatus: 'denied' });
  await startLocationWatch('browse');
  expect(getState().locationStatus).toBe('requesting');
  expect(L.watchPositionAsync).toHaveBeenCalled();
});

test('Android is never made to show the "improved accuracy" dialog', async () => {
  await startLocationWatch('navigate');
  expect(L.watchPositionAsync.mock.calls[0][0]).toMatchObject({ mayShowUserSettingsDialog: false });
  await acquireLocation();
  expect(L.getCurrentPositionAsync.mock.calls[0][0]).toMatchObject({ mayShowUserSettingsDialog: false });
});

test('a GPS answer that arrives after a demo position was chosen does not replace it', () => {
  actions.patchSettings({ demoPosition: 'garapan' });
  actions.setLocation(demoPositionFix('garapan'), 'granted');
  actions.setLocation({ ...OLD_FIX, lat: 38.9, lng: -77, at: Date.now() }, 'granted');
  expect(getState().location?.demo).toBe('garapan');
});

test('choosing the demo option that is already selected changes nothing', () => {
  const fix = { ...OLD_FIX, at: Date.now() };
  setState({ location: fix, locationStatus: 'granted' });
  setDemoPosition(null); // "Off — use GPS" while it is already off
  expect(getState().location).toEqual(fix);
  expect(L.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('every demo position is on the island its label names', () => {
  for (const id of DEMO_POSITION_IDS) {
    const fix = demoPositionFix(id)!;
    expect(demoPositionLabel(id)).toMatch(new RegExp(`, ${ISLAND_NAME[islandAt(fix)!]}$`));
  }
});
