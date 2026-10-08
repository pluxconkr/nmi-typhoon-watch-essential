/**
 * Differential + oracle checks for the loop fix: fixed (repo) vs pre-fix vs proposed (offset===0 guard).
 * snapToRoad is mocked so sentinel coordinates map to exact (edge, offset) road points.
 */
import { roadGraph } from '@/data/roads';
import type { RoadGraph, RoadPoint, TravelMode } from '@/domain/roads';
import { edgeReversible, edgeSlice, edgeSpeed, edgeUsable } from '@/domain/roads';
import { planRoute as planFixed, reachByRoad, routeToNearest, type Route } from '@/domain/routing';
import { planRoute as planOrig } from './zz-verify-loopadv-orig.test';
import { planRoute as planProp } from './zz-verify-loopadv-prop.test';

jest.mock('@/domain/roads', () => {
  const actual = jest.requireActual('@/domain/roads');
  return {
    ...actual,
    snapToRoad: (g: unknown, p: { lat: number; lng: number }, mode: unknown, maxM?: number) => {
      const f = (globalThis as any).__zzForced?.get(p.lat);
      return f ?? actual.snapToRoad(g, p, mode, maxM);
    },
  };
});

const forced = new Map<number, RoadPoint>();
(globalThis as any).__zzForced = forced;
let sentinel = 5000;
function rp(g: RoadGraph, edge: number, offset: number): RoadPoint {
  const [lat, lng] = edgeSlice(g, edge, offset, offset)[0];
  return { edge, offset, lat, lng, distM: 0 };
}
function sent(p: RoadPoint) {
  const key = sentinel++;
  forced.set(key, p);
  return { lat: key, lng: p.lng };
}

// binary-heap Dijkstra oracle
class Heap {
  k: number[] = []; v: number[] = [];
  get size() { return this.k.length; }
  push(key: number, val: number) {
    let i = this.k.length; this.k.push(key); this.v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (this.k[p] <= key) break; this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p; }
    this.k[i] = key; this.v[i] = val;
  }
  pop(): [number, number] {
    const topK = this.k[0], topV = this.v[0]; const lk = this.k.pop()!, lv = this.v.pop()!; const n = this.k.length;
    if (n > 0) { let i = 0; for (;;) { const l = 2 * i + 1; if (l >= n) break; const r = l + 1; const c = r < n && this.k[r] < this.k[l] ? r : l; if (this.k[c] >= lk) break; this.k[i] = this.k[c]; this.v[i] = this.v[c]; i = c; } this.k[i] = lk; this.v[i] = lv; }
    return [topK, topV];
  }
}
function oracleTimes(g: RoadGraph, s: RoadPoint, mode: TravelMode) {
  const time = new Float64Array(g.nodeCount).fill(Infinity);
  const v0 = edgeSpeed(g, s.edge, mode);
  const lenS = g.edgeLen[s.edge];
  const exits: [number, number][] = [[g.edgeTo[s.edge], lenS - s.offset]];
  if (edgeReversible(g, s.edge, mode)) exits.push([g.edgeFrom[s.edge], s.offset]);
  else if (s.offset === 0) exits.push([g.edgeFrom[s.edge], 0]);
  const heap = new Heap();
  for (const [n, d] of exits) if (d / v0 < time[n]) { time[n] = d / v0; heap.push(time[n], n); }
  while (heap.size) {
    const [t, u] = heap.pop();
    if (t > time[u]) continue;
    for (let i = g.adjStart[u]; i < g.adjStart[u + 1]; i++) {
      const e = g.adjEdges[i];
      if (!edgeUsable(g, e, mode)) continue;
      const rev = edgeReversible(g, e, mode);
      const arcs: number[] = [];
      if (g.edgeFrom[e] === u) arcs.push(g.edgeTo[e]);
      if (g.edgeTo[e] === u && rev) arcs.push(g.edgeFrom[e]);
      for (const w of arcs) { const nt = t + g.edgeLen[e] / edgeSpeed(g, e, mode); if (nt < time[w]) { time[w] = nt; heap.push(nt, w); } }
    }
  }
  return time;
}
const tcache = new Map<string, Float64Array>();
function oracleBest(g: RoadGraph, s: RoadPoint, t: RoadPoint, mode: TravelMode) {
  const key = `${g.island}:${s.edge}:${s.offset}:${mode}`;
  let time = tcache.get(key);
  if (!time) { time = oracleTimes(g, s, mode); tcache.set(key, time); }
  const v = edgeSpeed(g, t.edge, mode);
  const c: number[] = [time[g.edgeFrom[t.edge]] + t.offset / v];
  if (edgeReversible(g, t.edge, mode)) c.push(time[g.edgeTo[t.edge]] + (g.edgeLen[t.edge] - t.offset) / v);
  if (t.edge === s.edge) { const d = t.offset - s.offset; if (d >= 0 || edgeReversible(g, t.edge, mode)) c.push(Math.abs(d) / v); }
  const b = Math.min(...c);
  return Number.isFinite(b) ? b : null;
}
function checkRoute(g: RoadGraph, r: Route, s: RoadPoint, t: RoadPoint, mode: TravelMode): string[] {
  const bad: string[] = [];
  const legs = r.legs;
  if (!legs.length) return ['no legs'];
  if (legs[0].edge !== s.edge || Math.abs(legs[0].from - s.offset) > 1e-9) bad.push(`first leg ${JSON.stringify(legs[0])} != start`);
  const last = legs[legs.length - 1];
  if (last.edge !== t.edge || Math.abs(last.to - t.offset) > 1e-9) bad.push(`last leg ${JSON.stringify(last)} != end`);
  let sum = 0;
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    sum += Math.abs(l.to - l.from);
    if (mode === 'drive' && !edgeReversible(g, l.edge, mode) && l.to < l.from) bad.push(`leg ${i} one-way e${l.edge} backwards`);
    if (i > 0) {
      const p = legs[i - 1];
      const en = p.to === 0 ? g.edgeFrom[p.edge] : Math.abs(p.to - g.edgeLen[p.edge]) < 1e-9 ? g.edgeTo[p.edge] : -1;
      const sn = l.from === 0 ? g.edgeFrom[l.edge] : Math.abs(l.from - g.edgeLen[l.edge]) < 1e-9 ? g.edgeTo[l.edge] : -1;
      if (en === -1 || sn === -1 || en !== sn) bad.push(`joint ${i - 1}/${i} broken`);
    }
  }
  if (Math.abs(sum - r.distanceM) > 0.01) bad.push(`sum(legs)=${sum.toFixed(3)} != distanceM=${r.distanceM.toFixed(3)}`);
  return bad;
}

type Planner = typeof planFixed;
function evaluate(g: RoadGraph, plan: Planner, s: RoadPoint, t: RoadPoint, mode: TravelMode) {
  const from = sent(s);
  const to = sent(t);
  const r = plan(g, from, to, 'dest', mode);
  const reach = reachByRoad(g, from, [{ id: 'x', name: 'x', lat: to.lat, lng: to.lng }], mode)[0];
  const oracle = oracleBest(g, s, t, mode);
  const problems: string[] = [];
  if (oracle === null) { if (r || reach) problems.push('oracle says unreachable'); }
  else {
    if (!r) problems.push('planRoute null'); else {
      problems.push(...checkRoute(g, r, s, t, mode));
      if (Math.abs(r.durationS - oracle) > 0.05) problems.push(`dur ${r.durationS.toFixed(2)} != oracle ${oracle.toFixed(2)}`);
    }
    if (!reach) problems.push('reach missing');
    if (r && reach && Math.abs(r.distanceM - reach.distanceM) > 0.05) problems.push(`route.distanceM ${r.distanceM.toFixed(2)} != reach.distanceM ${reach.distanceM.toFixed(2)}`);
  }
  return { r, problems };
}

function loopsOf(g: RoadGraph) { const o: number[] = []; for (let e = 0; e < g.edgeCount; e++) if (g.edgeFrom[e] === g.edgeTo[e]) o.push(e); return o; }
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

describe.each(['saipan', 'tinian', 'rota'] as const)('%s', (island) => {
  const g = roadGraph(island);
  const rand = rng(12345 + island.length);
  const loops = loopsOf(g);
  const offsets = (len: number) => [0, 1e-6, 0.37, 0.2 * len, len / 2 - 1e-6, len / 2, len / 2 + 1e-6, 0.8 * len, len - 0.37, len];

  test('non-loop starts: fixed == pre-fix exactly (legs and distance)', () => {
    const modes: TravelMode[] = ['drive', 'walk'];
    let n = 0, diff = 0;
    const msgs: string[] = [];
    for (let k = 0; k < 1500; k++) {
      const mode = modes[k % 2];
      const e1 = Math.floor(rand() * g.edgeCount), e2 = Math.floor(rand() * g.edgeCount);
      if (!edgeUsable(g, e1, mode) || !edgeUsable(g, e2, mode) || g.edgeFrom[e1] === g.edgeTo[e1]) continue;
      const pick = (e: number) => { const x = rand(); return x < 0.15 ? 0 : x < 0.3 ? g.edgeLen[e] : x * g.edgeLen[e]; };
      const s = rp(g, e1, pick(e1)); const t = rp(g, e2, pick(e2));
      const a = planFixed(g, sent(s), sent(t), 'd', mode); const b = planOrig(g, sent(s), sent(t), 'd', mode);
      n++;
      if (JSON.stringify(a?.legs) !== JSON.stringify(b?.legs) || a?.distanceM !== b?.distanceM) { diff++; if (msgs.length < 5) msgs.push(`e${e1}@${s.offset} -> e${e2}@${t.offset} ${mode}`); }
    }
    console.log(`${island} non-loop differential: n=${n} differing=${diff} ${msgs.join('; ')}`);
    expect(diff).toBe(0);
  });

  test('loop starts/ends: oracle + invariants for fixed and proposed', () => {
    const rows: string[] = [];
    let n = 0, badFixed = 0, badProp = 0, onlyOff0Fixed = 0;
    // neighbours (edges sharing a node with the loop) as extra endpoints
    for (const L of loops) {
      const len = g.edgeLen[L];
      const N = g.edgeFrom[L];
      const nbrs: number[] = [];
      for (let i = g.adjStart[N]; i < g.adjStart[N + 1]; i++) { const e = g.adjEdges[i]; if (e !== L && !nbrs.includes(e)) nbrs.push(e); }
      const far: number[] = []; while (far.length < 4) far.push(Math.floor(rand() * g.edgeCount));
      for (const mode of ['drive', 'walk'] as TravelMode[]) {
        if (!edgeUsable(g, L, mode)) continue;
        const loopPts = offsets(len).map((o) => rp(g, L, Math.min(len, Math.max(0, o))));
        const other: RoadPoint[] = [];
        for (const e of [...nbrs, ...far]) if (edgeUsable(g, e, mode)) for (const f of [0, 0.5, 1]) other.push(rp(g, e, g.edgeLen[e] * f));
        const pairs: [RoadPoint, RoadPoint][] = [];
        for (const a of loopPts) { for (const b of loopPts) pairs.push([a, b]); for (const o of other) { pairs.push([a, o]); pairs.push([o, a]); } }
        for (const [s, t] of pairs) {
          n++;
          const f = evaluate(g, planFixed, s, t, mode);
          const p = evaluate(g, planProp, s, t, mode);
          if (f.problems.length) { badFixed++; if (!(s.edge === L && s.offset === 0 && !edgeReversible(g, L, mode))) { onlyOff0Fixed++; rows.push(`FIXED(unexpected) e${s.edge}@${s.offset.toFixed(2)} -> e${t.edge}@${t.offset.toFixed(2)} ${mode}: ${f.problems.join(' | ')}`); } }
          if (p.problems.length) { badProp++; rows.push(`PROP e${s.edge}@${s.offset.toFixed(2)} -> e${t.edge}@${t.offset.toFixed(2)} ${mode}: ${p.problems.join(' | ')}`); }
        }
      }
    }
    console.log(`${island} loops=${loops.length} cases=${n} badFixed=${badFixed} (of which not 'one-way loop start at offset 0': ${onlyOff0Fixed}) badProposed=${badProp}\n${rows.slice(0, 25).join('\n')}`);
  });
});

test('routeToNearest agrees with reachByRoad for starts on loops (saipan)', () => {
  const g = roadGraph('saipan');
  const rows: string[] = [];
  let n = 0;
  for (const L of loopsOf(g)) {
    const len = g.edgeLen[L];
    for (const mode of ['drive', 'walk'] as TravelMode[]) {
      if (!edgeUsable(g, L, mode)) continue;
      for (const o of [0, 0.2 * len, len / 2, 0.8 * len, len]) {
        const s = rp(g, L, o);
        const targets = [1000, 2500, 4000, 6000].filter((e) => edgeUsable(g, e, mode)).map((e) => { const t = rp(g, e, g.edgeLen[e] / 2); return { id: `e${e}`, name: `e${e}`, ...sent(t) }; });
        const reach = reachByRoad(g, sent(s), targets, mode);
        const near = routeToNearest(g, sent(s), targets, mode);
        n++;
        if (!reach.length || !near) { rows.push(`L${L}@${o} ${mode}: missing`); continue; }
        if (Math.abs(near.route.distanceM - reach[0].distanceM) > 0.05) rows.push(`L${L}@${o.toFixed(1)} ${mode}: nearest route ${near.route.distanceM.toFixed(1)} vs reach ${reach[0].distanceM.toFixed(1)}`);
      }
    }
  }
  console.log(`routeToNearest cases=${n}\n${rows.join('\n')}`);
});
