/**
 * Adversarial harness for the loop fix in routing.ts legsFor.
 * snapToRoad is mocked so that sentinel coordinates map to exact (edge, offset) road points.
 */
import { roadGraph } from '@/data/roads';
import type { RoadGraph, RoadPoint, TravelMode } from '@/domain/roads';
import { edgeReversible, edgeSlice, edgeSpeed, edgeUsable } from '@/domain/roads';
import { planRoute, reachByRoad, type Route } from '@/domain/routing';

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

// ---------- independent oracle ----------
class Heap {
  a: [number, number][] = [];
  push(k: number, v: number) { this.a.push([k, v]); this.a.sort((x, y) => x[0] - y[0]); }
  pop() { return this.a.shift()!; }
  get size() { return this.a.length; }
}
function oracleTimes(g: RoadGraph, s: RoadPoint, mode: TravelMode) {
  const time = new Float64Array(g.nodeCount).fill(Infinity);
  const dist = new Float64Array(g.nodeCount).fill(Infinity);
  const v0 = edgeSpeed(g, s.edge, mode);
  const lenS = g.edgeLen[s.edge];
  // exits from the start edge
  const exits: [number, number][] = [[g.edgeTo[s.edge], lenS - s.offset]];
  if (edgeReversible(g, s.edge, mode)) exits.push([g.edgeFrom[s.edge], s.offset]);
  else if (s.offset === 0) exits.push([g.edgeFrom[s.edge], 0]);
  // simple Dijkstra with a sorted array (small graphs, few runs)
  const heap = new Heap();
  for (const [n, d] of exits) if (d / v0 < time[n]) { time[n] = d / v0; dist[n] = d; heap.push(time[n], n); }
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
      for (const w of arcs) {
        const nt = t + g.edgeLen[e] / edgeSpeed(g, e, mode);
        if (nt < time[w]) { time[w] = nt; dist[w] = dist[u] + g.edgeLen[e]; heap.push(nt, w); }
      }
    }
  }
  return { time, dist, v0 };
}
/** Best time from s to t by the oracle (null if unreachable). */
function oracleBest(g: RoadGraph, s: RoadPoint, t: RoadPoint, mode: TravelMode, cache: Map<string, ReturnType<typeof oracleTimes>>) {
  const key = `${s.edge}:${s.offset}:${mode}`;
  let o = cache.get(key);
  if (!o) { o = oracleTimes(g, s, mode); cache.set(key, o); }
  const v = edgeSpeed(g, t.edge, mode);
  const cands: number[] = [];
  cands.push(o.time[g.edgeFrom[t.edge]] + t.offset / v);
  if (edgeReversible(g, t.edge, mode)) cands.push(o.time[g.edgeTo[t.edge]] + (g.edgeLen[t.edge] - t.offset) / v);
  if (t.edge === s.edge) {
    const d = t.offset - s.offset;
    if (d >= 0 || edgeReversible(g, t.edge, mode)) cands.push(Math.abs(d) / v);
  }
  const best = Math.min(...cands);
  return Number.isFinite(best) ? best : null;
}

// ---------- invariants ----------
function checkRoute(g: RoadGraph, r: Route, s: RoadPoint, t: RoadPoint, mode: TravelMode): string[] {
  const bad: string[] = [];
  const legs = r.legs;
  if (!legs.length) return ['no legs'];
  if (legs[0].edge !== s.edge || Math.abs(legs[0].from - s.offset) > 1e-9) bad.push(`first leg ${JSON.stringify(legs[0])} != start e${s.edge}@${s.offset}`);
  const last = legs[legs.length - 1];
  if (last.edge !== t.edge || Math.abs(last.to - t.offset) > 1e-9) bad.push(`last leg ${JSON.stringify(last)} != end e${t.edge}@${t.offset}`);
  let sum = 0;
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i];
    sum += Math.abs(l.to - l.from);
    if (mode === 'drive' && !edgeReversible(g, l.edge, mode) && l.to < l.from) bad.push(`leg ${i} drives one-way e${l.edge} backwards ${l.from}->${l.to}`);
    if (!edgeUsable(g, l.edge, mode)) bad.push(`leg ${i} uses unusable e${l.edge}`);
    if (i > 0) {
      const p = legs[i - 1];
      // leg i-1 ends at a node; leg i starts at a node: must be the same node
      const endNode = p.to === 0 ? g.edgeFrom[p.edge] : Math.abs(p.to - g.edgeLen[p.edge]) < 1e-9 ? g.edgeTo[p.edge] : -1;
      const startNode = l.from === 0 ? g.edgeFrom[l.edge] : Math.abs(l.from - g.edgeLen[l.edge]) < 1e-9 ? g.edgeTo[l.edge] : -1;
      if (endNode === -1 || startNode === -1) bad.push(`leg ${i - 1}->${i} joint not at a node: ${JSON.stringify(p)} / ${JSON.stringify(l)}`);
      else if (endNode !== startNode) bad.push(`leg ${i - 1}->${i} joint nodes differ: ${endNode} vs ${startNode}`);
      // For a loop, 0 and len are the same node, so the node check passes either way; also require continuity of the point.
    }
  }
  if (Math.abs(sum - r.distanceM) > 0.01) bad.push(`sum(legs)=${sum.toFixed(3)} != distanceM=${r.distanceM.toFixed(3)}`);
  return bad;
}

type Case = { s: RoadPoint; t: RoadPoint; mode: TravelMode };
const results: string[] = [];
function run(g: RoadGraph, c: Case, cache: Map<string, ReturnType<typeof oracleTimes>>, tag: string) {
  const from = sent(c.s);
  const to = sent(c.t);
  const r = planRoute(g, from, to, 'dest', c.mode);
  const reach = reachByRoad(g, from, [{ id: 'x', name: 'x', lat: to.lat, lng: to.lng }], c.mode)[0];
  const oracle = oracleBest(g, c.s, c.t, c.mode, cache);
  const problems: string[] = [];
  if (oracle === null) {
    if (r || reach) problems.push('oracle says unreachable but got a route/reach');
  } else {
    if (!r) problems.push('planRoute null but oracle reachable');
    if (!reach) problems.push('reach missing but oracle reachable');
    if (r) {
      problems.push(...checkRoute(g, r, c.s, c.t, c.mode));
      if (Math.abs(r.durationS - oracle) > 0.05) problems.push(`route duration ${r.durationS.toFixed(2)} != oracle ${oracle.toFixed(2)}`);
    }
    if (reach && Math.abs(reach.durationS - oracle) > 0.05) problems.push(`reach duration ${reach.durationS.toFixed(2)} != oracle ${oracle.toFixed(2)}`);
    if (r && reach && Math.abs(r.distanceM - reach.distanceM) > 0.05) problems.push(`route.distanceM ${r.distanceM.toFixed(2)} != reach.distanceM ${reach.distanceM.toFixed(2)}`);
  }
  if (problems.length) results.push(`${tag} s=e${c.s.edge}@${c.s.offset.toFixed(3)} t=e${c.t.edge}@${c.t.offset.toFixed(3)} ${c.mode}: ${problems.join(' | ')}`);
  return problems.length;
}

test('loops: start/end on the same loop and on other edges, all modes', () => {
  const g = roadGraph('saipan');
  const cache = new Map<string, ReturnType<typeof oracleTimes>>();
  const loops: number[] = [];
  for (let e = 0; e < g.edgeCount; e++) if (g.edgeFrom[e] === g.edgeTo[e]) loops.push(e);
  const fr = (len: number) => [0, 1e-6, 0.5, 0.2 * len, len / 2 - 1e-6, len / 2, len / 2 + 1e-6, 0.8 * len, len - 0.5, len - 1e-6, len];
  let n = 0;
  let nBad = 0;
  const modes: TravelMode[] = ['drive', 'walk'];
  // a handful of far-away reference edges
  const others = [100, 900, 2000, 3000, 4500, 6000];
  for (const L of loops) {
    const len = g.edgeLen[L];
    for (const mode of modes) {
      if (!edgeUsable(g, L, mode)) continue;
      const starts = fr(len).map((o) => rp(g, L, Math.min(len, Math.max(0, o))));
      for (const s of starts) {
        // same loop ends
        for (const t of starts) { n++; nBad += run(g, { s, t, mode }, cache, `L${L}`) ? 1 : 0; }
        // other edge ends
        for (const e of others) {
          if (!edgeUsable(g, e, mode)) continue;
          const t = rp(g, e, g.edgeLen[e] * 0.4);
          n++; nBad += run(g, { s, t, mode }, cache, `L${L}->other`) ? 1 : 0;
          n++; nBad += run(g, { s: t, t: s, mode }, cache, `other->L${L}`) ? 1 : 0;
        }
      }
    }
  }
  console.log(`cases=${n} bad=${nBad}\n` + results.slice(0, 80).join('\n'));
  (globalThis as any).__zzResults = results;
});
