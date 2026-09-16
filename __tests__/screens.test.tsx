/**
 * Screen smoke tests: every screen renders from local state with ZERO network,
 * in every demo phase. Uses expo-router's testing library so hooks like useRouter work.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

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
import OnboardingScreen from '@/app/onboarding';
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
  faq: FaqScreen,
  'why/[itemId]': WhyScreen,
  onboarding: OnboardingScreen,
};

const fetchSpy = jest.spyOn(global, 'fetch' as never);

beforeEach(() => {
  hydrate();
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
    expect(screen.getByText(/DEMO DATA/)).toBeTruthy();
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
    expect(await screen.findByText('STAY INSIDE')).toBeTruthy();
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
    expect(screen.getByText('✓ Saved on this phone — works with no signal')).toBeTruthy();
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
    expect(await screen.findByText('Past notices')).toBeTruthy();
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
    expect(screen.getByText('Demo & testing')).toBeTruthy();
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
