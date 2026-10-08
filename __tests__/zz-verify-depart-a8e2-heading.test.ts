import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeSlice, metresBetween } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

function bearing(aLat: number, aLng: number, bLat: number, bLng: number, kx: number) {
  const dx = (bLng - aLng) * kx;
  const dy = bLat - aLat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
const wordIdx = (deg: number) => Math.round(deg / 45) % 8;
const idxDiff = (a: number, b: number) => Math.min((a - b + 8) % 8, (b - a + 8) % 8);

test('heading word vs named road (exact-zero first legs), drive and walk', () => {
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = list.filter((s) => s.island === island).slice(0, 3);
    for (const mode of ['drive', 'walk'] as const) {
      const stats: Record<string, number> = {};
      const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
      const ex: any[] = [];
      for (let i = 0; i < g.nodeCount; i += 2) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        for (const d of dests) {
          const r = planRoute(g, from, d, d.name, mode);
          if (!r) continue;
          const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
          const L0 = len(r.legs[0]);
          if (L0 !== 0) continue; // only the exact-zero (fixed) case
          inc('routes A');
          const nl = r.legs.find((l) => len(l) > 0);
          if (!nl) { inc('A all-zero'); continue; }
          // bearing of the named leg over its first min(len,30) m
          const L = Math.min(30, len(nl));
          const pts = edgeSlice(g, nl.edge, nl.from, nl.to);
          // walk along pts to L metres
          let acc = 0, bLat = pts[0][0], bLng = pts[0][1];
          for (let p = 1; p < pts.length; p++) {
            const seg = metresBetween(pts[p - 1][0], pts[p - 1][1], pts[p][0], pts[p][1], g.kx);
            if (acc + seg >= L) { const t = seg === 0 ? 0 : (L - acc) / seg; bLat = pts[p - 1][0] + t * (pts[p][0] - pts[p - 1][0]); bLng = pts[p - 1][1] + t * (pts[p][1] - pts[p - 1][1]); acc = L; break; }
            acc += seg; bLat = pts[p][0]; bLng = pts[p][1];
          }
          const legBear = bearing(pts[0][0], pts[0][1], bLat, bLng, g.kx);
          const head = r.steps[0].heading;
          if (head === null) { inc('A heading null'); continue; }
          const diff = idxDiff(COMPASS.indexOf(head), wordIdx(legBear));
          inc('A heading diff=' + diff);
          if (diff >= 2) { inc('A named-road disagreement >=90deg'); if (ex.length < 6) ex.push({ island, mode, node: i, text: instructionFor(r.steps[0], d.name), namedLegLen: len(nl), legBear: Math.round(legBear), next: instructionFor(r.steps[1], d.name) + ' @' + r.steps[1].startDist.toFixed(1) }); }
          const s1 = r.steps[1];
          if (s1.maneuver === 'continue' && s1.startDist < 15) { inc('A early continue'); if (ex.length < 12) ex.push({ EARLY: true, island, mode, node: i, s0: instructionFor(r.steps[0], d.name), s1: instructionFor(s1, d.name) + ' @' + s1.startDist.toFixed(1), namedLen: len(nl) }); }
          if (s1.maneuver !== 'arrive' && s1.road !== null && s1.road === r.steps[0].road && s1.stayOn === false) inc('A step1 same road as depart but stayOn=false');
        }
      }
      console.log(island, mode, JSON.stringify(stats), JSON.stringify(ex, null, 0));
    }
  }
});
