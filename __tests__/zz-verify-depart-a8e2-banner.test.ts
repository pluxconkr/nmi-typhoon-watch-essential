import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeSlice, metresBetween } from '@/domain/roads';
import { planRoute, instructionFor, trackRoute } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const bearing = (aLat: number, aLng: number, bLat: number, bLng: number, kx: number) => ((Math.atan2((bLng - aLng) * kx, bLat - aLat) * 180) / Math.PI + 360) % 360;
const idxDiff = (a: number, b: number) => Math.min((a - b + 8) % 8, (b - a + 8) % 8);

test('heading disagreements that the navigation banner would actually show', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = list.filter((s) => s.island === island).slice(0, 3);
    for (const mode of ['drive', 'walk'] as const) {
      let a = 0, dis = 0, shown = 0;
      const ex: any[] = [];
      for (let i = 0; i < g.nodeCount; i++) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        for (const d of dests) {
          const r = planRoute(g, from, d, d.name, mode);
          if (!r || Math.abs(r.legs[0].to - r.legs[0].from) !== 0 || r.steps[0].heading === null) continue;
          a++;
          const nl = r.legs.find((l) => l.from !== l.to)!;
          const len = Math.abs(nl.to - nl.from);
          const L = Math.min(30, len);
          const pts = edgeSlice(g, nl.edge, nl.from, nl.to);
          let acc = 0, bLat = pts[0][0], bLng = pts[0][1];
          for (let p = 1; p < pts.length; p++) {
            const seg = metresBetween(pts[p - 1][0], pts[p - 1][1], pts[p][0], pts[p][1], g.kx);
            if (acc + seg >= L) { const t = seg === 0 ? 0 : (L - acc) / seg; bLat = pts[p - 1][0] + t * (pts[p][0] - pts[p - 1][0]); bLng = pts[p - 1][1] + t * (pts[p][1] - pts[p - 1][1]); acc = L; break; }
            acc += seg; bLat = pts[p][0]; bLng = pts[p][1];
          }
          const legBear = bearing(pts[0][0], pts[0][1], bLat, bLng, g.kx);
          const diff = idxDiff(COMPASS.indexOf(r.steps[0].heading!), Math.round(legBear / 45) % 8);
          if (diff < 2) continue;
          dis++;
          const pr = trackRoute(r, from, g.kx);
          const atStart = pr.stepIndex === 0 && pr.along < 25 && pr.toNextM >= 50;
          if (atStart) { shown++; if (ex.length < 3) ex.push({ i, dest: d.shelterId, text: instructionFor(r.steps[0], d.name), namedLegLen: len.toFixed(1), legBear: Math.round(legBear), next: instructionFor(r.steps[1], d.name) + '@' + r.steps[1].startDist.toFixed(0) }); }
        }
      }
      rows.push(`${island} ${mode}: exactZero=${a} headingDisagree>=90deg=${dis} bannerShowsDepart=${shown} ${JSON.stringify(ex)}`);
    }
  }
  console.log(rows.join('\n'));
});
