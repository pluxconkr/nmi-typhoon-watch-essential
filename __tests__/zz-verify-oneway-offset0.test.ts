import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, edgeSlice, edgeUsable, snapToRoad, type RoadGraph, type RoadPoint } from '@/domain/roads';
import { planRoute, reachByRoad, routeToNearest, trackRoute, type Route } from '@/domain/routing';
import type { IslandId } from '@/domain/geo';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');

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

function legProblems(g: RoadGraph, r: Route): string[] {
  const p: string[] = [];
  const L = r.legs;
  if (L[0].edge !== r.start.edge || Math.abs(L[0].from - r.start.offset) > 1e-9) p.push(`first leg ${JSON.stringify(L[0])} != start`);
  const last = L[L.length - 1];
  if (last.edge !== r.end.edge || Math.abs(last.to - r.end.offset) > 1e-9) p.push(`last leg != end`);
  const nodeAt = (e: number, off: number): number | null => (off === 0 ? g.edgeFrom[e] : Math.abs(off - g.edgeLen[e]) < 1e-9 ? g.edgeTo[e] : null);
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (!edgeReversible(g, l.edge, 'drive') && l.to < l.from) p.push(`leg ${i} one-way backwards`);
    if (i + 1 < L.length) {
      const exit = nodeAt(l.edge, l.to);
      const entry = nodeAt(L[i + 1].edge, L[i + 1].from);
      if (exit === null || entry === null || exit !== entry) p.push(`leg ${i}->${i + 1} not joined`);
    }
  }
  let sum = 0;
  for (const l of L) sum += Math.abs(l.to - l.from);
  if (Math.abs(sum - r.distanceM) > 1.0) p.push(`legs sum ${sum.toFixed(1)} != distanceM ${r.distanceM.toFixed(1)}`);
  return p;
}

function oneWayZeroStarts(g: RoadGraph) {
  const hits = new Map<number, { pos: { lat: number; lng: number }; snap: RoadPoint }>();
  const M = 111320;
  for (let e = 0; e < g.edgeCount; e++) {
    if (!edgeUsable(g, e, 'drive') || edgeReversible(g, e, 'drive')) continue;
    const A = g.edgeFrom[e];
    const s = g.geomStart[e];
    const dx = (g.ptLng[s + 1] - g.ptLng[s]) * g.kx;
    const dy = g.ptLat[s + 1] - g.ptLat[s];
    const n = Math.hypot(dx, dy) || 1;
    for (const d of [0, 0.3, 1, 3]) {
      const pos = { lat: g.nodeLat[A] - (dy / n) * (d / M), lng: g.nodeLng[A] - (dx / n / g.kx) * (d / M) };
      const snap = snapToRoad(g, pos, 'drive');
      if (snap && snap.offset === 0 && !edgeReversible(g, snap.edge, 'drive') && !hits.has(snap.edge)) hits.set(snap.edge, { pos, snap });
    }
  }
  return [...hits.values()];
}

function run(island: IslandId, seed: number) {
  const g = roadGraph(island);
  const r = rng(seed);
  const starts = oneWayZeroStarts(g);
  const notes: string[] = [];
  let total = 0, direct = 0, mismatch = 0, legBad = 0, slower = 0, dup = 0, improved = 0;
  for (const st of starts) {
    const e = st.snap.edge;
    const dests: { lat: number; lng: number; tag: string }[] = [];
    for (const f of [0.02, 0.25, 0.5, 0.75, 0.98, 1]) {
      const off = g.edgeLen[e] * f;
      const [lat, lng] = edgeSlice(g, e, off, off)[0];
      dests.push({ lat, lng, tag: `same-edge ${f}` });
    }
    // edges incident to the from-node and to-node
    for (const n of [g.edgeFrom[e], g.edgeTo[e]]) {
      for (let i = g.adjStart[n]; i < g.adjStart[n + 1]; i++) {
        const ee = g.adjEdges[i];
        if (!edgeUsable(g, ee, 'drive')) continue;
        for (const f of [0.1, 0.9]) {
          const off = g.edgeLen[ee] * f;
          const [lat, lng] = edgeSlice(g, ee, off, off)[0];
          dests.push({ lat, lng, tag: `incident e${ee} ${f}` });
        }
      }
    }
    for (let k = 0; k < 15; k++) {
      for (;;) {
        const ee = Math.floor(r() * g.edgeCount);
        if (!edgeUsable(g, ee, 'drive')) continue;
        const off = r() * g.edgeLen[ee];
        const [lat, lng] = edgeSlice(g, ee, off, off)[0];
        dests.push({ lat, lng, tag: 'random' });
        break;
      }
    }
    const T = dests.map((d, i) => ({ id: `d${i}`, name: d.tag, lat: d.lat, lng: d.lng }));
    const reach = reachByRoad(g, st.pos, T, 'drive');
    const reachOld = base.reachByRoad(g, st.pos, T, 'drive');
    const oldBy = new Map(reachOld.map((x) => [x.id, x]));
    for (const rc of reach) {
      const d = T.find((x) => x.id === rc.id)!;
      const a = planRoute(g, st.pos, d, d.name, 'drive');
      total++;
      if (!a) { notes.push(`null route e${e} -> ${d.name}`); continue; }
      const o = oldBy.get(rc.id);
      if (o && rc.durationS > o.durationS + 1e-6) { slower++; notes.push(`SLOWER reach e${e} -> ${d.name}`); }
      if (o && rc.durationS < o.durationS - 1e-6) improved++;
      if (Math.abs(a.distanceM - rc.distanceM) > 1 || Math.abs(a.durationS - rc.durationS) > 0.05) {
        mismatch++;
        notes.push(`MISMATCH e${e}${g.edgeFrom[e] === g.edgeTo[e] ? '(loop)' : ''} -> ${d.name}: route ${a.distanceM.toFixed(1)}m/${a.durationS.toFixed(1)}s vs reach ${rc.distanceM.toFixed(1)}m/${rc.durationS.toFixed(1)}s`);
      }
      const lp = legProblems(g, a);
      if (lp.length) { legBad++; notes.push(`LEGS e${e} -> ${d.name}: ${lp.join('; ')}`); }
      if (d.name.startsWith('same-edge')) {
        direct++;
        if (a.legs.length > 2 || (a.legs.length === 2 && !(a.legs[0].from === 0 && a.legs[0].to === 0))) notes.push(`same-edge legs odd e${e} ${d.name}: ${JSON.stringify(a.legs)}`);
        if (a.legs.length === 2 && a.legs[0].from === 0 && a.legs[0].to === 0) dup++;
      }
      // progress tracking at start and end
      const t0 = trackRoute(a, { lat: a.lat[0], lng: a.lng[0] }, g.kx);
      const t1 = trackRoute(a, { lat: a.end.lat, lng: a.end.lng }, g.kx, a.distanceM);
      if (!Number.isFinite(t0.remainingM) || Math.abs(t0.remainingM - a.distanceM) > 1) notes.push(`track start remaining ${t0.remainingM} vs ${a.distanceM} e${e} -> ${d.name}`);
      if (!Number.isFinite(t1.remainingM) || t1.remainingM > 1) notes.push(`track end remaining ${t1.remainingM} e${e} -> ${d.name}`);
      // routeToNearest on this single target should match
      const n1 = routeToNearest(g, st.pos, [d], 'drive');
      if (!n1 || Math.abs(n1.route.distanceM - a.distanceM) > 1e-6) notes.push(`routeToNearest differs e${e} -> ${d.name}`);
    }
  }
  return { island, starts: starts.length, total, direct, improved, slower, mismatch, legBad, zeroLenFirstLegOnSameEdge: dup, notes: notes.slice(0, 30) };
}

test('saipan offset-0 one-way starts, targeted destinations', () => {
  console.log(JSON.stringify(run('saipan', 99), null, 1));
}, 600000);
test('tinian offset-0 one-way starts, targeted destinations', () => {
  console.log(JSON.stringify(run('tinian', 5), null, 1));
}, 600000);
