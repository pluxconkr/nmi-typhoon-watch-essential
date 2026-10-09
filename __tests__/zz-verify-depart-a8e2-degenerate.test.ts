import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor, trackRoute } from '@/domain/routing';
import { NavSession } from '@/services/navigation';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('start == end at nodes, interior points, and between adjacent edges', () => {
  const g = roadGraph('saipan');
  const stats: Record<string, number> = {};
  const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
  const samples: any[] = [];
  for (const mode of ['drive', 'walk'] as const) {
    for (let i = 0; i < g.nodeCount; i += 7) {
      const p = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
      let r;
      try {
        r = planRoute(g, p, p, 'here', mode);
      } catch (e) {
        inc('THROW ' + String(e));
        continue;
      }
      if (!r) { inc('null'); continue; }
      inc('route');
      if (r.distanceM === 0) inc('distance 0');
      if (r.steps.length !== 2) { inc('steps != 2'); if (samples.length < 5) samples.push({ i, mode, steps: r.steps.map((s) => instructionFor(s, 'here')), dist: r.distanceM }); }
      const t = trackRoute(r, p, g.kx);
      if (!Number.isFinite(t.along) || !Number.isFinite(t.remainingM)) inc('NaN progress');
      if (r.steps[0].heading !== null && r.distanceM === 0) inc('heading set on zero route');
      if (Number.isNaN(r.durationS)) inc('NaN duration');
    }
    // Interior points
    for (let e = 0; e < g.edgeCount; e += 37) {
      const mid = Math.floor((g.geomStart[e] + g.geomStart[e] + g.geomCount[e] - 1) / 2);
      const p = { lat: g.ptLat[mid], lng: g.ptLng[mid] };
      const r = planRoute(g, p, p, 'here', mode);
      if (!r) { inc('interior null'); continue; }
      inc('interior route');
      if (r.steps.length !== 2) inc('interior steps != 2');
    }
  }
  console.log(JSON.stringify(stats), JSON.stringify(samples));
});

test('adjacent-edge: start at end of A, destination at start of B (both zero legs)', () => {
  const g = roadGraph('saipan');
  const out: any[] = [];
  let n = 0;
  for (let node = 0; node < g.nodeCount && out.length < 4; node += 5) {
    const p = { lat: g.nodeLat[node], lng: g.nodeLng[node] };
    // destination = a tiny nudge from the same node (1e-6 deg) so it may snap onto another edge at the same junction
    const q = { lat: p.lat + 3e-6, lng: p.lng + 3e-6 };
    const r = planRoute(g, p, q, 'near', 'drive');
    if (!r) continue;
    n++;
    if (r.distanceM < 2) out.push({ node, dist: r.distanceM, legs: r.legs.map((l) => `${edgeNameOf(g, l.edge)}(${Math.abs(l.to - l.from).toFixed(3)})`), steps: r.steps.map((s) => instructionFor(s, 'near') + '@' + s.startDist.toFixed(2)) });
  }
  console.log(n, JSON.stringify(out, null, 1));
});

test('NavSession with start == destination and with start on a junction', () => {
  const g = roadGraph('saipan');
  const k = byId('kagman-high-school');
  const here = { lat: g.nodeLat[10], lng: g.nodeLng[10] };
  const s = new NavSession({ kind: 'place', place: { id: 'x', name: 'here', lat: here.lat, lng: here.lng, island: 'saipan' } }, 'drive', () => g);
  s.update(here);
  const snap = s.getSnapshot();
  console.log('session status', snap.status, 'steps', snap.route?.steps.map((st) => instructionFor(st, 'here')));
  const s2 = new NavSession({ kind: 'place', place: { id: 'k', name: k.name, lat: k.lat, lng: k.lng, island: 'saipan' } }, 'drive', () => g);
  s2.update({ lat: g.nodeLat[67], lng: g.nodeLng[67], accuracyM: 5 });
  console.log('session2', s2.getSnapshot().status, s2.getSnapshot().route?.steps.slice(0, 2).map((st) => instructionFor(st, k.name) + '@' + st.startDist));
});
