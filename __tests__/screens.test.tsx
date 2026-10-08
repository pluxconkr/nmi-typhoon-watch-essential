/**
 * Screen smoke tests: every screen renders from local state with ZERO network,
 * in every demo phase. Uses expo-router's testing library so hooks like useRouter work.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

/**
 * renderRouter switches Jest to fake timers. A `findBy*`/`waitFor` after a press advances those timers in a
 * way that leaves the next test's render empty, so every press is wrapped in act() + runOnlyPendingTimers()
 * and followed by synchronous queries.
 */
async function press(el: ReturnType<typeof screen.getByText>) {
  await act(async () => {
    fireEvent.press(el);
    jest.runOnlyPendingTimers();
  });
}

import AlertDetailScreen from '@/app/alert/[id]';
import DownloadsScreen from '@/app/downloads';
import FaqScreen from '@/app/faq';
import HistoryScreen from '@/app/history';
import HouseholdScreen from '@/app/household';
import NavigateScreen from '@/app/navigate';
import OnboardingScreen from '@/app/onboarding';
import SettingsScreen from '@/app/settings';
import StoreDetailScreen from '@/app/store/[id]';
import SuppliesScreen from '@/app/supplies';
import ChecklistScreen from '@/app/(tabs)/checklist';
import AlertScreen from '@/app/(tabs)/index';
import ShelterScreen from '@/app/(tabs)/shelter';
import ShelterDetailScreen from '@/app/shelter/[id]';
import WhyScreen from '@/app/why/[itemId]';
import { applyDemoScenario, buildDemoAlerts } from '@/services/demo';
import { actions, getState, hydrate, setState } from '@/store/appStore';

const routes = {
  index: AlertScreen,
  checklist: ChecklistScreen,
  shelter: ShelterScreen,
  'alert/[id]': AlertDetailScreen,
  history: HistoryScreen,
  household: HouseholdScreen,
  'shelter/[id]': ShelterDetailScreen,
  downloads: DownloadsScreen,
  settings: SettingsScreen,
  navigate: NavigateScreen,
  supplies: SuppliesScreen,
  'store/[id]': StoreDetailScreen,
  faq: FaqScreen,
  'why/[itemId]': WhyScreen,
  onboarding: OnboardingScreen,
};

const fetchSpy = jest.spyOn(globalThis, 'fetch' as never);

beforeEach(() => {
  hydrate();
  actions.patchSettings({ demoPosition: null });
  setState({ network: { online: false, type: 'NONE' }, locationStatus: 'denied', location: null });
  actions.saveHousehold({ ...getState().household, people: 4, elders: 1, infants: 0, pets: 1, generator: false, prepDays: 3 }, { finishOnboarding: true });
  fetchSpy.mockClear();
});

afterAll(() => fetchSpy.mockRestore());

describe('Alert tab in every phase (offline, no fetch)', () => {
  test('calm: no active alert, prepare cards', async () => {
    applyDemoScenario('live');
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('No active typhoon alert')).toBeTruthy();
    expect(screen.getByText('OFFLINE MODE · using data bundled with the app')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('before: storm name, countdown, exactly 3 tasks, plain summary, DEMO label', async () => {
    applyDemoScenario('before');
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Typhoon Sinlaku')).toBeTruthy();
    expect(screen.getByText(/Demo data/)).toBeTruthy();
    expect(screen.getByText(/^\d+h \d{2}m \d{2}s$/)).toBeTruthy();
    expect(screen.getByText('Do these 3 today')).toBeTruthy();
    // 42h10m to onset → the 48h window (spec: >48h = 72h window, >24h = 48h window)
    expect(screen.getByText('NOW · 48h window')).toBeTruthy();
    expect(screen.getByText('Buy water & 7-day medication')).toBeTruthy();
    expect(screen.getByText('Fill car fuel tank')).toBeTruthy();
    expect(screen.getByText('Charge power banks')).toBeTruthy();
    // Tapping the 72h bar previews that window's tasks (download while you still have signal).
    await press(screen.getByLabelText('72h window, passed'));
    expect(screen.getByText('Download map & shelters')).toBeTruthy();
    expect(screen.getByText('NOW · 72h window · preview')).toBeTruthy();
    expect(screen.getByText(/Typhoon force winds reach Saipan Tuesday morning/)).toBeTruthy();
    expect(screen.queryByText(/PRECAUTIONARY\/PREPAREDNESS ACTIONS/)).toBeNull(); // official text only on S-02
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('during: STAY INSIDE, eye-of-storm card, emergency numbers', async () => {
    applyDemoScenario('during');
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Stay inside')).toBeTruthy();
    expect(screen.getByText('If the wind suddenly stops')).toBeTruthy();
    expect(screen.getByText('(670) 237-8000')).toBeTruthy();
    expect(screen.queryByText('Do these 3 today')).toBeNull();
  });

  test('after: all clear, hazards remain, no network features', async () => {
    applyDemoScenario('after');
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('The storm has passed')).toBeTruthy();
    expect(screen.getByText('Before you go outside')).toBeTruthy();
    expect(screen.getByText('Assume every downed line is live')).toBeTruthy();
    expect(screen.getByText(/These need a network connection/)).toBeTruthy();
  });
});

describe('Checklist tab', () => {
  test('shows rules-table quantities and toggles persist in the store', async () => {
    await renderRouter(routes, { initialUrl: '/checklist' });
    expect(await screen.findByText('4 people · 1 elder · 1 pet')).toBeTruthy();
    expect(screen.getByText('60 L')).toBeTruthy();
    expect(screen.getByText('$200')).toBeTruthy();
    expect(screen.getByText('7 days')).toBeTruthy();
    expect(screen.getByText(/Saved on this phone — works with no signal/)).toBeTruthy();
    await press(screen.getByLabelText('Drinking water, 60 L, not yet done'));
    expect(getState().checklist.water.done).toBe(true);
    expect(getState().checklist.water.qtyAtCheck).toBe(60);
    expect(screen.getByLabelText('Drinking water, 60 L, done')).toBeTruthy();
  });

  test('why screen shows the multiplication', async () => {
    await renderRouter(routes, { initialUrl: '/why/water' });
    expect(await screen.findByText('4 L × 3 days × 5 people = 60 L')).toBeTruthy();
  });
});

describe('Shelter tab and detail (bundled data, offline)', () => {
  test('list renders from the bundled copy with no fetch, grouped by village without GPS', async () => {
    await renderRouter(routes, { initialUrl: '/shelter' });
    expect(await screen.findByText(/Shelters by village/)).toBeTruthy();
    expect(screen.getByText('Marianas High School')).toBeTruthy();
    expect(screen.getByText(/No signal — showing the list that came with the app/)).toBeTruthy();
    expect(screen.getByText('© OpenStreetMap contributors')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('detail shows landmark directions, HSEM number, what to bring', async () => {
    await renderRouter(routes, { initialUrl: '/shelter/kagman-high-school' });
    expect(await screen.findByText('Kagman High School')).toBeTruthy();
    expect(screen.getByText('(670) 237-8000')).toBeTruthy();
    expect(screen.getByText('Bring from your checklist')).toBeTruthy();
    expect(screen.getByText('Pet food')).toBeTruthy();
    expect(screen.getByText('Medication')).toBeTruthy();
  });
});

describe('Alert detail, history, FAQ, downloads, household, onboarding', () => {
  test('alert detail shows official text + provenance', async () => {
    applyDemoScenario('before');
    const [w] = buildDemoAlerts('before');
    await renderRouter(routes, { initialUrl: `/alert/${encodeURIComponent(w.alertId)}` });
    expect(await screen.findByText('Official text · unedited')).toBeTruthy();
    expect(screen.getByText(/PRECAUTIONARY\/PREPAREDNESS ACTIONS/)).toBeTruthy();
    expect(screen.getByText('NWS Tiyan GU (NWS Guam, WFO GUM)')).toBeTruthy();
    expect(screen.getByText(/The summary above does not replace this text/)).toBeTruthy();
  });

  test('history lists saved notices', async () => {
    applyDemoScenario('after');
    await renderRouter(routes, { initialUrl: '/history' });
    expect((await screen.findAllByText('Past notices')).length).toBeGreaterThan(0); // nav bar + large title
    expect(screen.getByText(/is cancelled; hazards remain/)).toBeTruthy();
    expect(screen.getAllByText(/Typhoon Warning/).length).toBeGreaterThanOrEqual(2);
  });

  test('FAQ has the six during-storm situations and opens one', async () => {
    await renderRouter(routes, { initialUrl: '/faq' });
    expect(await screen.findByText('The wind suddenly stopped')).toBeTruthy();
    await press(screen.getByText('The wind suddenly stopped'));
    expect(screen.getByText(/You may be in the eye of the storm/)).toBeTruthy();
    expect(screen.getByText('911 · (670) 237-8000')).toBeTruthy();
  });

  test('downloads shows saved items and a disabled refresh button offline', async () => {
    await renderRouter(routes, { initialUrl: '/downloads' });
    expect(await screen.findByText('Shelter list')).toBeTruthy();
    expect(screen.getByText('No signal — will retry automatically')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  test('household editor previews changes before saving', async () => {
    await renderRouter(routes, { initialUrl: '/household' });
    expect(await screen.findByText('No changes yet. Adjust a number above.')).toBeTruthy();
    await press(screen.getByLabelText('Increase People in household'));
    await press(screen.getByLabelText('Increase People in household'));
    expect(screen.getByLabelText('Drinking water: 60 L to 84 L')).toBeTruthy();
    await press(screen.getByTestId('household-save'));
    expect(getState().household.people).toBe(6);
  });

  test('onboarding saves and finishes', async () => {
    setState({ onboarded: false });
    await renderRouter(routes, { initialUrl: '/onboarding' });
    expect(await screen.findByText('Who lives with you?')).toBeTruthy();
    await press(screen.getByTestId('onboarding-save'));
    expect(getState().onboarded).toBe(true);
  });
});

describe('GPS position and Settings', () => {
  test('settings holds notifications and demo controls; a demo position stands in for GPS', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    expect(await screen.findByText('Demo & testing')).toBeTruthy();
    expect(screen.getByText('Notify me about new NWS alerts')).toBeTruthy();
    await press(screen.getByText('Garapan, Saipan'));
    expect(getState().settings.demoPosition).toBe('garapan');
    expect(getState().location?.demo).toBe('garapan');
    expect(getState().location?.lat).toBeCloseTo(15.207, 2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('settings sets how often to check NWS; automatic is the default', async () => {
    actions.patchSettings({ pollInterval: 'auto' });
    await renderRouter(routes, { initialUrl: '/settings' });
    expect(await screen.findByText('Check for new alerts')).toBeTruthy();
    expect(screen.getByText('Automatic')).toBeTruthy();
    expect(screen.getByText(/Now: every hour — no storm alert/)).toBeTruthy();
    await press(screen.getByText('Every 30 minutes'));
    expect(getState().settings.pollInterval).toBe(30);
    expect(screen.getByText(/Now: every 30 minutes\./)).toBeTruthy();
    actions.patchSettings({ pollInterval: 'auto' });
  });

  test('the Shelter tab labels a demo position and never calls the network', async () => {
    actions.patchSettings({ demoPosition: 'kagman' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/shelter' });
    expect(await screen.findByText('Demo position · Kagman, Saipan')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('the Shelter tab explains a denied location permission', async () => {
    await renderRouter(routes, { initialUrl: '/shelter' });
    setState({ locationStatus: 'denied', location: null });
    expect(await screen.findByText('Location permission is off')).toBeTruthy();
  });
});

describe('Directions (offline road routing)', () => {
  test('from a Garapan position the Shelter tab ranks shelters by road and starts full-screen navigation', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/shelter' });
    expect(await screen.findByText('Nearest shelter by road')).toBeTruthy();
    expect(screen.getByText(/Saipan · by road from you/)).toBeTruthy();
    // The damaged Office on Aging is closer by road, but it is not on the latest list.
    expect(screen.getAllByText('Garapan Elementary School').length).toBeGreaterThan(0);
    expect(screen.getByText(/Used in earlier storms · call HSEM first/)).toBeTruthy();
    await press(screen.getByText('Start navigation'));
    expect(screen.getByTestId('navigate')).toBeTruthy();
    expect(screen.getByText('End')).toBeTruthy();
    expect(screen.getByText(/^(Head|Turn|Bear|Keep|Continue)/)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('shelter detail offers drive and walk directions with road times', async () => {
    actions.patchSettings({ demoPosition: 'kagman' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/shelter/kagman-high-school' });
    expect(await screen.findByText(/^Drive · \d+ min$/)).toBeTruthy();
    expect(screen.getByText(/^Walk · /)).toBeTruthy();
  });

  test('a storm-damaged shelter from an earlier storm warns before anything else', async () => {
    await renderRouter(routes, { initialUrl: '/shelter/saipan-office-on-aging' });
    expect(await screen.findByText('Damaged — check before going')).toBeTruthy();
    expect(screen.getByText('Not on the latest shelter list')).toBeTruthy();
    expect(screen.getByText('No — earlier storms only')).toBeTruthy();
  });

  test('a shelter on another island explains that directions cannot cross the sea', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/navigate?to=shelter:tinian-elementary-school' });
    expect(await screen.findByText('Tinian Elementary School is on Tinian')).toBeTruthy();
  });
});

describe('Supplies (bundled, verified, offline)', () => {
  test('the supplies list ranks stores on your island by road and never calls the network', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/supplies' });
    expect(await screen.findByText('Where to buy supplies')).toBeTruthy();
    expect(screen.getByText(/Saipan · mapped stores by road/)).toBeTruthy();
    expect(screen.getByText(/exact spot is not published/)).toBeTruthy();
    expect(screen.getByText('Mobil Garapan (Beach Road)')).toBeTruthy();
    await press(screen.getByText('Gas'));
    expect(screen.queryByText('Joeten Superstore')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('a store shows directions, details and how it was checked', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/store/mobil-garapan-beach-road' });
    expect(await screen.findByText('Mobil Garapan (Beach Road)')).toBeTruthy();
    expect(screen.getByText(/^Drive · /)).toBeTruthy();
    expect(screen.getByText('How this was checked')).toBeTruthy();
    expect(screen.getAllByText(/saipan\.mobil\.com/).length).toBeGreaterThan(0);
  });

  test('shelter detail lists where to buy supplies nearby', async () => {
    await renderRouter(routes, { initialUrl: '/shelter/marianas-high-school' });
    expect(await screen.findByText('Where to buy supplies nearby')).toBeTruthy();
  });
});

describe('Map gestures (pinch, drag, double-tap)', () => {
  /** Fire a gesture and let its result (sent back to React through a microtask) render. */
  async function gesture(testId: string, events: Parameters<typeof fireGestureHandler>[1]) {
    await act(async () => {
      fireGestureHandler(getByGestureTestId(testId), events);
      jest.advanceTimersByTime(400);
    });
  }
  const pinch = (scale: number, focalX = 150, focalY = 100) => [
    { state: State.BEGAN, focalX, focalY },
    { state: State.ACTIVE, scale: 1, focalX, focalY },
    { scale: (1 + scale) / 2, focalX, focalY },
    { scale, focalX, focalY },
    { state: State.END, scale, focalX, focalY },
  ];
  const drag = (dx: number, dy: number) => [
    { state: State.BEGAN },
    { state: State.ACTIVE, translationX: 0, translationY: 0 },
    { translationX: dx / 2, translationY: dy / 2 },
    { state: State.END, translationX: dx, translationY: dy },
  ];

  test('the Shelter map zooms with a pinch, drags only once zoomed, and goes back to the whole island', async () => {
    await renderRouter(routes, { initialUrl: '/shelter' });
    expect(await screen.findByLabelText(/^Map of Saipan/)).toBeTruthy();
    // Whole island: a one-finger drag belongs to the page scroll, not the map.
    await gesture('island-map-pan', drag(80, 0));
    expect(screen.queryByText('All of Saipan')).toBeNull();
    await gesture('island-map-pinch', pinch(3));
    expect(screen.getByText('All of Saipan')).toBeTruthy();
    expect(screen.getByLabelText(/Pinch to zoom, drag to move\.$/)).toBeTruthy();
    await gesture('island-map-pan', drag(-60, 40));
    expect(screen.getByText('All of Saipan')).toBeTruthy();
    await press(screen.getByText('All of Saipan'));
    expect(screen.queryByText('All of Saipan')).toBeNull();
  });

  test('a pinch back out on the Shelter map returns to the whole island', async () => {
    await renderRouter(routes, { initialUrl: '/shelter' });
    expect(await screen.findByLabelText(/^Map of Saipan/)).toBeTruthy();
    await gesture('island-map-pinch', pinch(2));
    expect(screen.getByText('All of Saipan')).toBeTruthy();
    await gesture('island-map-pinch', pinch(0.4));
    expect(screen.queryByText('All of Saipan')).toBeNull();
  });

  test('dragging or pinching the navigation map stops following you; Re-centre follows again', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/navigate?to=nearest-shelter' });
    expect(await screen.findByLabelText('Show the whole route')).toBeTruthy();
    await gesture('nav-map-pan', drag(90, -50));
    expect(screen.getByLabelText('Re-centre on my position')).toBeTruthy();
    await press(screen.getByLabelText('Re-centre on my position'));
    expect(screen.getByLabelText('Show the whole route')).toBeTruthy();
    await gesture('nav-map-pinch', pinch(2.5, 200, 400));
    expect(screen.getByLabelText('Re-centre on my position')).toBeTruthy();
  });

  test('double-tapping the navigation map zooms in about the tap', async () => {
    actions.patchSettings({ demoPosition: 'garapan' });
    hydrate();
    await renderRouter(routes, { initialUrl: '/navigate?to=nearest-shelter' });
    expect(await screen.findByLabelText('Show the whole route')).toBeTruthy();
    await gesture('nav-map-double-tap', [{ state: State.BEGAN, x: 200, y: 300 }, { state: State.ACTIVE, x: 200, y: 300 }, { state: State.END, x: 200, y: 300 }]);
    expect(screen.getByLabelText('Re-centre on my position')).toBeTruthy();
  });
});
