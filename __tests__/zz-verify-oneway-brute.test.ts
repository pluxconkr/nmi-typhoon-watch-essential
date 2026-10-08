import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeReversible, edgeSlice, edgeUsable, snapToRoad, type RoadGraph, type RoadPoint } from '@/domain/roads';
import { planRoute, reachByRoad, routeToNearest, type Route } from '@/domain/routing';
import type { Shelter } from '@/domain/types';
import type { IslandId } from '@/domain/geo';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');

const list = shelters.shelters as Shelter[];

/** Validate that route legs form a legal drive path from start to end. */
function legProblems(g: RoadGraph, r: Route): string[] {
  const p: string[] = [];
  const L = r.legs;
  if (L.length === 0) return ['no legs'];
  if (L[0].edge !== r.start.edge || Math.abs(L[0].from - r.start.offset) > 1e-9) p.push(`first leg ${JSON.stringify(L[0])} != start ${r.start.edge}@${r.start.offset}`);
  const last = L[L.length - 1];
  if (last.edge !== r.end.edge || Math.abs(last.to - r.end.offset) > 1e-9) p.push(`last leg ${JSON.stringify(last)} != end ${r.end.edge}@${r.end.offset}`);
  const nodeAt = (e: number, off: number): number | null => (off === 0 ? g.edgeFrom[e] : Math.abs(off - g.edgeLen[e]) < 1e-9 ? g.edgeTo[e] : null);
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (!edgeReversible(g, l.edge, 'drive') && l.to < l.from) p.push(`leg ${i} drives one-way edge ${l.edge} backwards ${l.from}->${l.to}`);
    if (i + 1 < L.length) {
      const exit = nodeAt(l.edge, l.to);
      const entry = nodeAt(L[i + 1].edge, L[i + 1].from);
      if (exit === null || entry === null || exit !== entry) p.push(`leg ${i}->${i + 1} not joined: exit node ${exit} entry node ${entry}`);
    }
  }
  let sum = 0;
  for (const l of L) sum += Math.abs(l.to - l.from);
  if (Math.abs(sum - r.distanceM) > 1.0) p.push(`legs sum ${sum.toFixed(2)} != distanceM ${r.distanceM.toFixed(2)}`);
  return p;
}

function collectStarts(g: RoadGraph): { pos: { lat: number; lng: number }; snap: RoadPoint; how: string }[] {
  const hits = new Map<string, { pos: { lat: number; lng: number }; snap: RoadPoint; how: string }>();
  const deltas = [0, 0.3, 1, 3];
  const M = 111320;
  for (let e = 0; e < g.edgeCount; e++) {
    if (!edgeUsable(g, e, 'drive') || edgeReversible(g, e, 'drive')) continue;
    const A = g.edgeFrom[e];
    const s = g.geomStart[e];
    // direction of first segment
    const dx = (g.ptLng[s + 1] - g.ptLng[s]) * g.kx;
    const dy = g.ptLat[s + 1] - g.ptLat[s];
    const n = Math.hypot(dx, dy) || 1;
    for (const d of deltas) {
      const back = { lat: g.nodeLat[A] - (dy / n) * (d / M), lng: g.nodeLng[A] - (dx / n / g.kx) * (d / M) };
      const snap = snapToRoad(g, back, 'drive');
      if (snap && snap.offset === 0 && !edgeReversible(g, snap.edge, 'drive')) {
        const key = `${snap.edge}`;
        if (!hits.has(key)) hits.set(key, { pos: back, snap, how: `edge ${e} back ${d}m` });
      }
    }
  }
  return [...hits.values()];
}

function run(island: IslandId, maxStarts: number) {
  const g = roadGraph(island);
  const starts = collectStarts(g);
  const dests = list.filter((s) => s.island === island).map((s) => ({ id: s.shelterId, name: s.name, lat: s.lat, lng: s.lng }));
  const report: string[] = [];
  report.push(`${island}: ${starts.length} distinct one-way offset-0 starts, ${dests.length} shelter destinations`);
  let checked = 0, fixedWorse = 0, mismatch = 0, legBad = 0, improved = 0, same = 0;
  for (const st of starts.slice(0, maxStarts)) {
    const reach = reachByRoad(g, st.pos, dests, 'drive');
    const reachOld = base.reachByRoad(g, st.pos, dests, 'drive');
    const oldById = new Map(reachOld.map((r) => [r.id, r]));
    for (const rc of reach) {
      const d = dests.find((x) => x.id === rc.id)!;
      const r = planRoute(g, st.pos, d, d.name, 'drive');
      const ro = base.planRoute(g, st.pos, d, d.name, 'drive');
      checked++;
      const o = oldById.get(rc.id);
      if (o) {
        if (rc.durationS > o.durationS + 1e-6) { fixedWorse++; report.push(`WORSE reach: start e${st.snap.edge} -> ${rc.id}: ${rc.durationS} vs old ${o.durationS}`); }
        else if (rc.durationS < o.durationS - 1e-6) improved++;
        else same++;
      }
      if (!r) { report.push(`planRoute null for ${rc.id} from e${st.snap.edge}`); continue; }
      if (Math.abs(r.distanceM - rc.distanceM) > 1 || Math.abs(r.durationS - rc.durationS) > 0.05) {
        mismatch++;
        report.push(`MISMATCH start e${st.snap.edge}@0 (${st.pos.lat.toFixed(6)},${st.pos.lng.toFixed(6)}) -> ${rc.id}: route ${r.distanceM.toFixed(1)}m/${r.durationS.toFixed(1)}s vs reach ${rc.distanceM.toFixed(1)}m/${rc.durationS.toFixed(1)}s (old route ${ro?.distanceM.toFixed(1)}m/${ro?.durationS.toFixed(1)}s) legs0=${JSON.stringify(r.legs[0])}`);
      }
      const lp = legProblems(g, r);
      if (lp.length) { legBad++; report.push(`LEGS start e${st.snap.edge} -> ${rc.id}: ${lp.join('; ')}`); }
    }
  }
  report.push(`checked=${checked} improved=${improved} same=${same} fixedWorse=${fixedWorse} mismatch=${mismatch} legBad=${legBad}`);
  return report;
}

test('saipan brute force', () => {
  console.log(run('saipan', 400).slice(0, 80).join('\n'));
}, 600000);
test('tinian brute force', () => {
  console.log(run('tinian', 400).slice(0, 80).join('\n'));
}, 600000);
