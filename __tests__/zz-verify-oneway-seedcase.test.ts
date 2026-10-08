import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeReversible, edgeSlice, edgeUsable, snapToRoad } from '@/domain/roads';
import { planRoute, reachByRoad } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const BASE = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/baseline/node_modules/rb/routing-baseline.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require(BASE) as typeof import('@/domain/routing');
const k = (shelters.shelters as Shelter[]).find((s) => s.shelterId === 'kagman-high-school')!;

test('seed case from the bug report', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  const T = [{ id: 'k', name: k.name, lat: k.lat, lng: k.lng }];
  for (const lng of [145.783559, 145.7835591]) {
    const pos = { lat: 15.222878, lng };
    const sn = snapToRoad(g, pos, 'drive')!;
    const f = reachByRoad(g, pos, T, 'drive')[0];
    const o = base.reachByRoad(g, pos, T, 'drive')[0];
    out.push(`lng ${lng}: snap e${sn.edge}@${sn.offset.toFixed(4)} oneWay=${!edgeReversible(g, sn.edge, 'drive')} node(from)=${g.edgeFrom[sn.edge]} node(to)=${g.edgeTo[sn.edge]} len=${g.edgeLen[sn.edge].toFixed(1)} distM=${sn.distM.toFixed(3)} | fixed ${(f.durationS / 60).toFixed(2)} min ${f.distanceM.toFixed(0)} m | baseline ${(o.durationS / 60).toFixed(2)} min ${o.distanceM.toFixed(0)} m`);
  }
  // Edges at the junction
  const sn = snapToRoad(g, { lat: 15.222878, lng: 145.7835591 }, 'drive')!;
  const sn2 = snapToRoad(g, { lat: 15.222878, lng: 145.783559 }, 'drive')!;
  for (const s of [sn, sn2]) {
    for (const n of [g.edgeFrom[s.edge], g.edgeTo[s.edge]]) {
      const es: string[] = [];
      for (let i = g.adjStart[n]; i < g.adjStart[n + 1]; i++) {
        const e = g.adjEdges[i];
        es.push(`e${e}(${g.edgeFrom[e]}->${g.edgeTo[e]}, ${edgeReversible(g, e, 'drive') ? 'two-way' : 'ONE-WAY'}, usable=${edgeUsable(g, e, 'drive')}, len=${g.edgeLen[e].toFixed(1)}, ${g.names[g.edgeName[e]] ?? '-'})`);
      }
      out.push(`node ${n} (${g.nodeLat[n]}, ${g.nodeLng[n]}): ${es.join(' ; ')}`);
    }
  }
  console.log(out.join('\n'));
});

test('sweep ahead along the one-way edge from the junction: discontinuity', () => {
  const g = roadGraph('saipan');
  const T = [{ id: 'k', name: k.name, lat: k.lat, lng: k.lng }];
  const hit = snapToRoad(g, { lat: 15.222878, lng: 145.7835591 }, 'drive')!;
  const sw = snapToRoad(g, { lat: 15.222878, lng: 145.783559 }, 'drive')!;
  // pick the one-way edge among the two snaps, with offset 0
  const cand = [hit, sw].find((s) => !edgeReversible(g, s.edge, 'drive') && s.offset === 0);
  const out: string[] = [];
  if (!cand) { out.push('no one-way offset-0 snap among the two'); console.log(out.join('\n')); return; }
  const e = cand.edge;
  out.push(`one-way edge e${e} len ${g.edgeLen[e].toFixed(1)}`);
  for (const off of [0, 0.001, 0.01, 0.05, 0.2, 0.5, 1, 2, 5, 10, 20, 40]) {
    const [lat, lng] = edgeSlice(g, e, off, off)[0];
    const pos = { lat, lng };
    const sn = snapToRoad(g, pos, 'drive')!;
    const f = reachByRoad(g, pos, T, 'drive')[0];
    const o = base.reachByRoad(g, pos, T, 'drive')[0];
    out.push(`ahead ${String(off).padStart(6)} m: snap e${sn.edge}@${sn.offset.toFixed(3)} fixed ${(f.durationS / 60).toFixed(2)} min | baseline ${(o.durationS / 60).toFixed(2)} min`);
  }
  console.log(out.join('\n'));
});
