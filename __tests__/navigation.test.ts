/**
 * Navigation session: a simulated drive along the planned route advances progress and steps, leaving the
 * route triggers a re-plan, and reaching the destination ends the session. Real Saipan/Tinian graphs.
 */
import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import type { IslandId } from '@/domain/geo';
import type { Shelter } from '@/domain/types';
import { navRequestFor } from '@/services/destinations';
import { NavSession } from '@/services/navigation';

const list = shelters.shelters as Shelter[];
const place = (id: string) => {
  const s = list.find((x) => x.shelterId === id)!;
  return { id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng, island: s.island as IslandId };
};
const GARAPAN = { lat: 15.2069, lng: 145.7196, accuracyM: 5 };
/** NavSession's off-route distance. */
const OFF_ROUTE_DEMO_M = 35;

test('a simulated drive follows the route step by step and arrives', () => {
  const session = new NavSession({ kind: 'place', place: place('marianas-high-school') }, 'drive', roadGraph);
  session.update(GARAPAN);
  const first = session.getSnapshot();
  expect(first.status).toBe('navigating');
  const route = first.route!;
  let lastAlong = -1;
  let lastStep = 0;
  // Drive along the polyline, one fix every few points.
  for (let i = 0; i < route.lat.length; i += 3) {
    session.update({ lat: route.lat[i], lng: route.lng[i], accuracyM: 5 });
    const s = session.getSnapshot();
    if (s.status === 'arrived') break;
    expect(s.progress!.along).toBeGreaterThanOrEqual(lastAlong - 1);
    expect(s.progress!.stepIndex).toBeGreaterThanOrEqual(lastStep);
    lastAlong = s.progress!.along;
    lastStep = s.progress!.stepIndex;
  }
  session.update({ lat: route.end.lat, lng: route.end.lng, accuracyM: 5 });
  expect(session.getSnapshot().status).toBe('arrived');
  expect(session.getSnapshot().reroutes).toBe(0);
});

test('three fixes well off the route re-plan from where you are', () => {
  const session = new NavSession({ kind: 'place', place: place('kagman-high-school') }, 'drive', roadGraph);
  session.update(GARAPAN);
  const before = session.getSnapshot().route!;
  // Wrong turn: head north up Beach Road instead (~400 m north of the start).
  const wrong = { lat: GARAPAN.lat + 0.0036, lng: GARAPAN.lng - 0.0008, accuracyM: 5 };
  session.update(wrong);
  session.update(wrong);
  expect(session.getSnapshot().reroutes).toBe(0);
  session.update(wrong);
  const after = session.getSnapshot();
  expect(after.reroutes).toBe(1);
  expect(after.route).not.toBe(before);
  expect(after.progress!.offRouteM).toBeLessThan(80);
});

test('nearest picks the fastest shelter on your island; other islands and the open sea are explained', () => {
  const saipan = list.filter((s) => s.island === 'saipan').map((s) => place(s.shelterId));
  const nearest = new NavSession({ kind: 'nearest', places: saipan, label: 'shelter' }, 'drive', roadGraph);
  nearest.update(GARAPAN);
  expect(nearest.getSnapshot().status).toBe('navigating');
  expect(['saipan-office-on-aging', 'garapan-elementary-school']).toContain(nearest.getSnapshot().target!.id);

  const tinian = new NavSession({ kind: 'place', place: place('tinian-elementary-school') }, 'drive', roadGraph);
  tinian.update(GARAPAN);
  expect(tinian.getSnapshot().status).toBe('other-island');
  expect(tinian.getSnapshot().targetIsland).toBe('tinian');

  const sea = new NavSession({ kind: 'place', place: place('marianas-high-school') }, 'drive', roadGraph);
  sea.update({ lat: 37.5665, lng: 126.978, accuracyM: 10 }); // Seoul
  expect(sea.getSnapshot().status).toBe('off-island');
});

test('switching to walking re-plans with the walking network', () => {
  const session = new NavSession({ kind: 'place', place: place('marianas-high-school') }, 'drive', roadGraph);
  session.update(GARAPAN);
  const drive = session.getSnapshot().route!;
  session.setMode('walk');
  const walk = session.getSnapshot();
  expect(walk.mode).toBe('walk');
  expect(walk.route!.mode).toBe('walk');
  expect(walk.route!.durationS).toBeGreaterThan(drive.durationS);
});

test('"nearest" never picks a shelter that is only from an earlier storm', () => {
  const request = navRequestFor('nearest-shelter', list);
  expect(request?.kind).toBe('nearest');
  const ids = request?.kind === 'nearest' ? request.places.map((p) => p.id) : [];
  expect(ids).not.toContain('saipan-office-on-aging');
  expect(ids).toHaveLength(10);
  const session = new NavSession(request!, 'drive', roadGraph);
  session.update(GARAPAN);
  expect(session.getSnapshot().target!.id).toBe('garapan-elementary-school');
  const medical = navRequestFor('nearest-medical-shelter', list);
  const medicalIds = medical?.kind === 'nearest' ? medical.places.map((p) => p.id).sort() : [];
  expect(medicalIds).toEqual(['dr-rita-hocog-inos-jr-sr-high-school', 'kagman-community-center', 'rota-office-on-aging-sinapalo', 'tinian-middle-high-school']);
});

test('a fix far from the route never counts as arriving, even though it projects onto the road end', () => {
  const session = new NavSession({ kind: 'place', place: place('marianas-high-school') }, 'drive', roadGraph);
  session.update({ lat: 15.1234, lng: 145.7037, accuracyM: 5 }); // Koblerville
  expect(session.getSnapshot().status).toBe('navigating');
  session.update(GARAPAN); // 5 km away, beyond the shelter
  expect(session.getSnapshot().status).toBe('navigating');
  expect(session.getSnapshot().progress!.offRouteM).toBeGreaterThan(1000);
});

test('arriving on another island re-plans there instead of following the old island\'s route', () => {
  const tinian = new NavSession({ kind: 'place', place: place('tinian-elementary-school') }, 'drive', roadGraph);
  tinian.update({ lat: 14.96958, lng: 145.62507, accuracyM: 5 }); // San Jose, Tinian
  expect(tinian.getSnapshot().status).toBe('navigating');
  tinian.update(GARAPAN);
  expect(tinian.getSnapshot().status).toBe('other-island');

  const all = list.filter((s) => s.designation !== 'past').map((s) => place(s.shelterId));
  const nearest = new NavSession({ kind: 'nearest', places: all, label: 'shelter' }, 'drive', roadGraph);
  nearest.update({ lat: 14.96958, lng: 145.62507, accuracyM: 5 });
  expect(nearest.getSnapshot().target!.island).toBe('tinian');
  nearest.update(GARAPAN);
  expect(nearest.getSnapshot().status).toBe('navigating');
  expect(nearest.getSnapshot().target!.island).toBe('saipan');
});

test('"nearest" re-picks the shelter when you leave the route: from where you are now, another one may be closer', () => {
  const current = list.filter((s) => s.designation !== 'past' && s.island === 'saipan').map((s) => place(s.shelterId));
  const session = new NavSession({ kind: 'nearest', places: current, label: 'shelter' }, 'drive', roadGraph);
  session.update({ lat: 15.172391, lng: 145.77538, accuracyM: 5 }); // Kagman
  const first = session.getSnapshot().target!.id;
  expect(first).not.toBe('garapan-elementary-school');
  for (let i = 0; i < 3; i++) session.update(GARAPAN);
  expect(session.getSnapshot().reroutes).toBe(1);
  expect(session.getSnapshot().target!.id).toBe('garapan-elementary-school');
});

test('starting away from the mapped roads (a house, a yard) is not a wrong turn, so there is no endless re-planning', () => {
  const session = new NavSession({ kind: 'place', place: place('kagman-high-school') }, 'drive', roadGraph);
  const yard = { lat: 15.172391, lng: 145.77538, accuracyM: 5 }; // Kagman village point, about 110 m from a road
  session.update(yard);
  expect(session.getSnapshot().route!.start.distM).toBeGreaterThan(OFF_ROUTE_DEMO_M);
  for (let i = 0; i < 12; i++) session.update(yard);
  expect(session.getSnapshot().reroutes).toBe(0);
});

test('a position saved before navigation started is not used; a fresh one is', () => {
  const startedAt = Date.now();
  const session = new NavSession({ kind: 'place', place: place('marianas-high-school') }, 'drive', roadGraph, startedAt);
  session.update({ ...GARAPAN, at: startedAt - 2 * 86_400_000 }); // yesterday's saved fix
  expect(session.getSnapshot().status).toBe('locating');
  expect(session.getSnapshot().fix).toBeNull();
  session.update({ lat: 15.1234, lng: 145.7037, accuracyM: 5, at: startedAt + 1_000 });
  expect(session.getSnapshot().status).toBe('navigating');
  expect(session.getSnapshot().fix!.lat).toBe(15.1234);
});
