import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeSlice, metresBetween } from '@/domain/roads';
import { planRoute as planNew, instructionFor } from '@/domain/routing';
import { planRoute as planOld } from './zz-verify-depart-a8e2-oldcopy.test';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number, kx: number) {
  const dx = (bLng - aLng) * kx;
  const dy = bLat - aLat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
/** bearing leaving the first point of a slice, looking ~15 m ahead */
function leaving(g: any, edge: number, from: number, to: number) {
  const len = g.edgeLen[edge];
  const dir = to >= from ? 1 : -1;
  const far = Math.max(0, Math.min(len, from + dir * Math.min(15, Math.max(0.5, Math.abs(to - from) || len))));
  const pts = edgeSlice(g, edge, from, far === from ? (dir > 0 ? Math.min(len, from + 1) : Math.max(0, from - 1)) : far);
  return bearingDeg(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], g.kx);
}
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

test('D1a: is the dropped name a through road?', () => {
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = list.filter((s) => s.island === island).slice(0, 3);
    for (const mode of ['drive'] as const) {
      const buckets: Record<string, number> = {};
      const inc = (k: string) => (buckets[k] = (buckets[k] ?? 0) + 1);
      const ex: any[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < g.nodeCount; i++) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        for (const d of dests) {
          const rn = planNew(g, from, d, d.name, mode);
          const ro = planOld(g, from, d, d.name, mode);
          if (!rn || !ro) continue;
          if (Math.abs(rn.legs[0].to - rn.legs[0].from) !== 0) continue;
          if (!(rn.steps[0].road === null && ro.steps[0].road !== null)) continue;
          const key = `${i}:${rn.legs[0].edge}:${rn.legs.find((l) => l.from !== l.to)!.edge}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const z = rn.legs[0];
          const nz = rn.legs.find((l) => l.from !== l.to)!;
          // direction leaving the junction along the zero-length (start) edge, away from the node
          const zLen = g.edgeLen[z.edge];
          const zAtStart = z.from === 0;
          const zb = zAtStart ? leaving(g, z.edge, 0, zLen) : leaving(g, z.edge, zLen, 0);
          const nb = leaving(g, nz.edge, nz.from, nz.to);
          const diff = angDiff(zb, nb);
          const cls = diff >= 150 ? 'through (opposite away-directions: E1 continues E0 straight on)' : diff <= 30 ? 'fork/spur (same away-direction)' : 'angled junction';
          inc(cls);
          if (diff >= 150 && ex.length < 6) ex.push({ node: i, dest: d.shelterId, oldText: instructionFor(ro.steps[0], d.name), newText: instructionFor(rn.steps[0], d.name), next: instructionFor(rn.steps[1], d.name) + '@' + rn.steps[1].startDist.toFixed(1), zeroEdge: z.edge, zName: edgeNameOf(g, z.edge), secondEdge: nz.edge, secondLen: Math.abs(nz.to - nz.from).toFixed(1), diff: Math.round(diff) });
        }
      }
      console.log(island, mode, JSON.stringify(buckets), JSON.stringify(ex, null, 0));
    }
  }
});
