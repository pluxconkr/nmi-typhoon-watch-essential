/**
 * Offline routing on the real bundled OSM road graphs: snapping, fastest routes, nearest shelter by road,
 * turn-by-turn steps and progress tracking.
 */
import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { haversineKm } from '@/domain/geo';
import { edgeReversible, snapToRoad } from '@/domain/roads';
import { type Route, instructionFor, planRoute, reachByRoad, routeToNearest, trackRoute } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;
const GARAPAN = { lat: 15.2069, lng: 145.7196 };
const asDest = (s: Shelter) => ({ id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng });

describe('road graphs', () => {
  test('all three islands decode with a connected drivable network', () => {
    for (const island of ['saipan', 'tinian', 'rota'] as const) {
      const g = roadGraph(island);
      expect(g.nodeCount).toBeGreaterThan(500);
      expect(g.edgeCount).toBeGreaterThan(g.nodeCount * 0.9);
      expect(g.attribution).toMatch(/OpenStreetMap/);
      for (let e = 0; e < g.edgeCount; e++) expect(g.edgeLen[e]).toBeGreaterThan(0);
    }
  });

  test('snapping finds the nearest road and refuses points far out at sea', () => {
    const g = roadGraph('saipan');
    const p = snapToRoad(g, GARAPAN, 'drive');
    expect(p).not.toBeNull();
    expect(p!.distM).toBeLessThan(80);
    expect(snapToRoad(g, { lat: 15.2, lng: 145.6 }, 'drive')).toBeNull();
  });
});

describe('routes', () => {
  test('Garapan to Kagman High School: a plausible drive with steps from depart to arrive', () => {
    const g = roadGraph('saipan');
    const k = byId('kagman-high-school');
    const t0 = Date.now();
    const r = planRoute(g, GARAPAN, k, k.name, 'drive')!;
    expect(Date.now() - t0).toBeLessThan(500);
    expect(r).not.toBeNull();
    const straightM = haversineKm(GARAPAN, k) * 1000;
    expect(r.distanceM).toBeGreaterThan(straightM);
    expect(r.distanceM).toBeLessThan(straightM * 2.5);
    expect(r.durationS).toBeGreaterThan(r.distanceM / 16); // never faster than 55 km/h on average
    expect(r.steps[0].maneuver).toBe('depart');
    expect(r.steps[r.steps.length - 1].maneuver).toBe('arrive');
    expect(r.steps.length).toBeGreaterThan(2);
    for (let i = 1; i < r.cumDist.length; i++) expect(r.cumDist[i]).toBeGreaterThanOrEqual(r.cumDist[i - 1]);
    for (const s of r.steps) expect(instructionFor(s, k.name).length).toBeGreaterThan(4);
    expect(instructionFor(r.steps[r.steps.length - 1], k.name)).toMatch(/^Arrive at Kagman High School/);
    // HSEM's landmark directions for this shelter say "end of Lalanghita Road / Half Flower Street"; the route agrees.
    expect(k.landmarkHint).toMatch(/Lalanghita Road \/ Half Flower Street/);
    expect(r.steps.map((s) => s.road)).toEqual(expect.arrayContaining(['Lalanghita Road', 'Half Flower Street']));
    // Double maneuvers across divided roads are merged into one.
    for (let i = 2; i < r.steps.length - 1; i++) expect(r.steps[i].startDist - r.steps[i - 1].startDist).toBeGreaterThanOrEqual(15);
    // The polyline starts and ends on the snapped road points.
    expect(Math.abs(r.lat[0] - r.start.lat)).toBeLessThan(1e-6);
    expect(Math.abs(r.lat[r.lat.length - 1] - r.end.lat)).toBeLessThan(1e-6);
  });

  test('driving never travels a one-way edge backwards, also when starting inside a one-way loop', () => {
    const g = roadGraph('saipan');
    const k = byId('kagman-high-school');
    const SENTADA_COURT_20 = { lat: 15.121477935191388, lng: 145.69761369576898 }; // 20% along the one-way loop e3345
    const starts = [GARAPAN, SENTADA_COURT_20, { lat: 15.1234, lng: 145.7037 }, { lat: 15.2214, lng: 145.7385 }];
    let checked = 0;
    for (const from of starts) {
      for (const to of [k, byId('koblerville-elementary-school'), byId('tanapag-middle-school')]) {
        const r = planRoute(g, from, to, to.name, 'drive')!;
        for (const leg of r.legs) {
          if (edgeReversible(g, leg.edge, 'drive')) continue;
          expect(leg.to).toBeGreaterThanOrEqual(leg.from);
          checked++;
        }
        // The polyline and the reported distance agree with the search.
        const reach = reachByRoad(g, from, [{ id: to.shelterId, name: to.name, lat: to.lat, lng: to.lng }], 'drive')[0];
        expect(Math.abs(r.distanceM - reach.distanceM)).toBeLessThan(1);
      }
    }
    expect(checked).toBeGreaterThan(0);
    const loop = planRoute(g, SENTADA_COURT_20, k, k.name, 'drive')!;
    expect(loop.legs[0]).toMatchObject({ edge: 3345 });
    expect(loop.legs[0].to).toBeGreaterThan(loop.legs[0].from);
  });

  test('standing on a junction where a one-way road begins, you may leave by any road', () => {
    const g = roadGraph('saipan');
    const k = byId('kagman-high-school');
    // Two fixes 1 cm apart on the same junction: one snaps to the end of one road, the other to the start of a one-way road.
    const a = planRoute(g, { lat: 15.222878, lng: 145.783559 }, k, k.name, 'drive')!;
    const b = planRoute(g, { lat: 15.222878, lng: 145.7835591 }, k, k.name, 'drive')!;
    expect(Math.abs(a.durationS - b.durationS)).toBeLessThan(2);
  });

  test('positions next to one-way dead ends still get a drivable route', () => {
    const g = roadGraph('saipan');
    const k = byId('kagman-high-school');
    for (const p of [
      { lat: 15.16819, lng: 145.71465 },
      { lat: 15.12292, lng: 145.72291 },
      { lat: 15.16816, lng: 145.71497 },
      { lat: 15.2107, lng: 145.72477 },
    ]) {
      expect(planRoute(g, p, k, k.name, 'drive')).not.toBeNull();
      expect([1035, 5013, 5014, 5918, 6093, 6094]).not.toContain(snapToRoad(g, p, 'drive')!.edge);
    }
  });

  test('the first instruction names the road you actually leave on', () => {
    const g = roadGraph('saipan');
    // These fixes snap exactly onto a junction, so the first road piece has no length.
    const ke = byId('kagman-elementary-school');
    const r = planRoute(g, { lat: 15.136576, lng: 145.720368 }, ke, ke.name, 'drive')!;
    expect(r.steps[0].road).toBe('Chalan Monsignor Martinez');
    expect(r.steps[1]).not.toMatchObject({ maneuver: 'continue', road: 'Chalan Monsignor Martinez' });
    const m = byId('marianas-high-school');
    expect(planRoute(g, { lat: 15.14, lng: 145.703754 }, m, m.name, 'drive')!.steps[0].road).toBe('Henaro Place');
  });

  test('a right-then-left jog keeps both turns instead of becoming "continue"', () => {
    const g = roadGraph('saipan');
    // Chalan Pale Arnold goes straight on here; the route turns right onto Ammurh Drive and left again 41 m later.
    const r = planRoute(g, { lat: 15.240799, lng: 145.758507 }, { lat: 15.241218, lng: 145.760139 }, 'Ammurh Drive', 'drive')!;
    expect(r.steps).not.toContainEqual(expect.objectContaining({ maneuver: 'continue', road: 'Ammurh Drive' }));
    expect(r.steps).toContainEqual(expect.objectContaining({ maneuver: 'turn', side: 'right', road: 'Ammurh Drive' }));
  });

  test('walking is never longer than driving between the same points', () => {
    const g = roadGraph('saipan');
    const m = byId('marianas-high-school');
    const drive = planRoute(g, GARAPAN, m, m.name, 'drive')!;
    const walk = planRoute(g, GARAPAN, m, m.name, 'walk')!;
    expect(walk.distanceM).toBeLessThanOrEqual(drive.distanceM + 1);
    expect(walk.durationS).toBeGreaterThan(drive.durationS);
  });

  test('nearest shelter by road from Garapan is one of the two Garapan shelters, ranked by travel time', () => {
    const g = roadGraph('saipan');
    const saipanShelters = list.filter((s) => s.island === 'saipan').map(asDest);
    const reach = reachByRoad(g, GARAPAN, saipanShelters, 'drive');
    expect(reach.length).toBe(saipanShelters.length);
    expect(['saipan-office-on-aging', 'garapan-elementary-school']).toContain(reach[0].id);
    for (let i = 1; i < reach.length; i++) expect(reach[i].durationS).toBeGreaterThanOrEqual(reach[i - 1].durationS);
    const nearest = routeToNearest(g, GARAPAN, saipanShelters, 'drive')!;
    expect(nearest.target.id).toBe(reach[0].id);
    expect(Math.abs(nearest.route.distanceM - reach[0].distanceM)).toBeLessThan(1);
  });

  test('Tinian and Rota shelters are reachable on their own islands only', () => {
    const tg = roadGraph('tinian');
    const [a, b] = list.filter((s) => s.island === 'tinian');
    expect(planRoute(tg, a, b, b.name, 'drive')).not.toBeNull();
    const rg = roadGraph('rota');
    const [c, d] = list.filter((s) => s.island === 'rota');
    expect(planRoute(rg, c, d, d.name, 'drive')).not.toBeNull();
    expect(planRoute(tg, GARAPAN, a, a.name, 'drive')).toBeNull();
  });
});

describe('progress', () => {
  test('a fix halfway along is tracked as halfway, a fix 300 m off is off-route', () => {
    const g = roadGraph('saipan');
    const k = byId('kagman-high-school');
    const r = planRoute(g, GARAPAN, k, k.name, 'drive')!;
    const mid = Math.floor(r.lat.length / 2);
    const on = trackRoute(r, { lat: r.lat[mid], lng: r.lng[mid] }, g.kx);
    expect(on.offRouteM).toBeLessThan(1);
    expect(Math.abs(on.along - r.cumDist[mid])).toBeLessThan(1);
    expect(on.remainingM).toBeCloseTo(r.distanceM - r.cumDist[mid], 0);
    expect(on.toNextM).toBeGreaterThanOrEqual(0);
    const off = trackRoute(r, { lat: r.lat[mid] + 0.0027, lng: r.lng[mid] }, g.kx, on.along);
    expect(off.offRouteM).toBeGreaterThan(100);
    const end = trackRoute(r, { lat: r.end.lat, lng: r.end.lng }, g.kx);
    expect(end.remainingM).toBeLessThan(1);
    expect(end.stepIndex).toBe(r.steps.length - 2);
  });

  test('a noisy fix next to the other half of a divided road does not jump ahead to it', () => {
    const g = roadGraph('tinian');
    // North up Broadway, round the turnaround, and back south on the other carriageway 16-20 m away.
    const r = planRoute(g, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 'there', 'drive')!;
    const at = (d: number) => pointAlong(r, d);
    const mPerDegLat = 111_320;
    let prev = 0;
    for (let d = 0; d < 3800; d += 14) {
      let fix = at(d);
      if (d === 2002) {
        // GPS error: 10 m towards the nearest point of the route's later, southbound part.
        let near = { lat: 0, lng: 0, m: Infinity };
        for (let d2 = 4000; d2 < r.distanceM; d2 += 2) {
          const q = at(d2);
          const m = Math.hypot((q.lat - fix.lat) * mPerDegLat, (q.lng - fix.lng) * mPerDegLat * g.kx);
          if (m < near.m) near = { ...q, m };
        }
        expect(near.m).toBeLessThan(25);
        const k = 10 / near.m;
        fix = { lat: fix.lat + (near.lat - fix.lat) * k, lng: fix.lng + (near.lng - fix.lng) * k };
      }
      const p = trackRoute(r, fix, g.kx, prev);
      expect(Math.abs(p.along - d)).toBeLessThan(30);
      prev = p.along;
    }
  });
});

/** The point `d` metres along a route. */
function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}
