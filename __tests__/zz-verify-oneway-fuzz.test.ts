import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, edgeSlice, edgeUsable, snapToRoad, type RoadGraph } from '@/domain/roads';
import { planRoute, reachByRoad, routeToNearest, trackRoute, type Route } from '@/domain/routing';
import type { Shelter } from '@/domain/types';
import type { IslandId } from '@/domain/geo';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');
const list = shelters.shelters as Shelter[];

// deterministic PRNG
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPoint(g: RoadGraph, r: () => number) {
  // random point on a random usable edge, jittered by up to ~jit metres
  for (;;) {
    const e = Math.floor(r() * g.edgeCount);
    if (!edgeUsable(g, e, 'drive')) continue;
    const off = r() * g.edgeLen[e];
    const [lat, lng] = edgeSlice(g, e, off, off)[0];
    return { lat, lng };
  }
}

function sameRoute(a: Route, b: Route): boolean {
  return a.distanceM === b.distanceM && a.durationS === b.durationS && JSON.stringify(a.legs) === JSON.stringify(b.legs) && a.lat.length === b.lat.length;
}

function stepProblems(g: RoadGraph, r: Route): string[] {
  const p: string[] = [];
  if (r.steps[0].maneuver !== 'depart') p.push('first step not depart');
  if (r.steps[r.steps.length - 1].maneuver !== 'arrive') p.push('last step not arrive');
  for (let i = 1; i < r.steps.length; i++) if (r.steps[i].startDist < r.steps[i - 1].startDist) p.push(`step ${i} startDist decreases`);
  const firstReal = r.legs.find((l) => l.from !== l.to) ?? r.legs[0];
  if (r.steps[0].road !== edgeNameOf(g, firstReal.edge)) p.push(`depart road ${r.steps[0].road} != first real leg road ${edgeNameOf(g, firstReal.edge)}`);
  if (r.distanceM > 0 && r.steps[0].heading === null) p.push('no heading');
  for (let i = 0; i < r.cumDist.length; i++) if (!Number.isFinite(r.cumDist[i]) || !Number.isFinite(r.cumTime[i]) || !Number.isFinite(r.lat[i])) p.push('non-finite polyline');
  return p;
}

function fuzz(island: IslandId, seed: number, n: number) {
  const g = roadGraph(island);
  const r = rng(seed);
  const dests = list.filter((s) => s.island === island);
  let total = 0, differ = 0, differWithoutOffset0 = 0, fixedSlower = 0, routeReachMismatch = 0, stepBad = 0;
  const notes: string[] = [];
  for (let i = 0; i < n; i++) {
    const from = randomPoint(g, r);
    const sn = snapToRoad(g, from, 'drive')!;
    const isTarget = !edgeReversible(g, sn.edge, 'drive') && sn.offset === 0;
    for (const mode of ['drive', 'walk'] as const) {
      const targets = [dests[Math.floor(r() * dests.length)], dests[Math.floor(r() * dests.length)], { ...randomPoint(g, r), shelterId: 'rnd', name: 'rnd' } as unknown as Shelter];
      for (const t of targets) {
        const a = planRoute(g, from, t, t.name, mode);
        const b = base.planRoute(g, from, t, t.name, mode);
        total++;
        if (!a || !b) { if (!!a !== !!b) notes.push('null mismatch'); continue; }
        if (!sameRoute(a, b)) {
          differ++;
          if (!(isTarget && mode === 'drive')) { differWithoutOffset0++; notes.push(`DIFF (not offset-0 oneway) from ${JSON.stringify(from)} mode ${mode}`); }
          if (a.durationS > b.durationS + 1e-6) { fixedSlower++; notes.push(`fixed slower: ${a.durationS} vs ${b.durationS}`); }
        }
        const reach = reachByRoad(g, from, [{ id: 'x', name: 'x', lat: t.lat, lng: t.lng }], mode)[0];
        if (!reach || Math.abs(reach.distanceM - a.distanceM) > 1 || Math.abs(reach.durationS - a.durationS) > 0.05) { routeReachMismatch++; notes.push(`route/reach mismatch from ${JSON.stringify(from)} to ${t.name} (${mode}): ${a.distanceM.toFixed(1)}/${a.durationS.toFixed(1)} vs ${reach?.distanceM.toFixed(1)}/${reach?.durationS.toFixed(1)}`); }
        const sp = stepProblems(g, a);
        if (sp.length) { stepBad++; notes.push(`steps: ${sp.join('; ')}`); }
      }
    }
  }
  return { total, differ, differWithoutOffset0, fixedSlower, routeReachMismatch, stepBad, notes: notes.slice(0, 12) };
}

test('random starts saipan: fixed == baseline unless one-way offset-0 start', () => {
  const res = fuzz('saipan', 12345, 150);
  console.log('saipan ' + JSON.stringify(res, null, 1));
}, 600000);
test('random starts tinian/rota', () => {
  console.log('tinian ' + JSON.stringify(fuzz('tinian', 777, 120), null, 1));
  console.log('rota ' + JSON.stringify(fuzz('rota', 4242, 120), null, 1));
}, 600000);
