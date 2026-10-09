import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeReversible, edgeSlice, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
const bearing = (aLat: number, aLng: number, bLat: number, bLng: number, kx: number) => ((Math.atan2((bLng - aLng) * kx, bLat - aLat) * 180) / Math.PI + 360) % 360;
const idxDiff = (a: number, b: number) => Math.min((a - b + 8) % 8, (b - a + 8) % 8);

test('direct same-edge routes (interior to interior, both directions, and from a junction)', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    for (const mode of ['drive', 'walk'] as const) {
      const st: Record<string, number> = {};
      const inc = (k: string) => (st[k] = (st[k] ?? 0) + 1);
      const ex: any[] = [];
      for (let e = 0; e < g.edgeCount; e += 3) {
        const len = g.edgeLen[e];
        if (len < 120) continue;
        const at = (frac: number) => {
          const sl = edgeSlice(g, e, len * frac, len * frac);
          return { lat: sl[0][0], lng: sl[0][1] };
        };
        for (const [fa, fb] of [[0.25, 0.75], [0.75, 0.25], [0, 0.5], [1, 0.5], [0.5, 0], [0.5, 1]] as const) {
          const a = at(fa);
          const b = at(fb);
          const sa = snapToRoad(g, a, mode, 5);
          const sb = snapToRoad(g, b, mode, 5);
          if (!sa || !sb || sa.edge !== e || sb.edge !== e) continue; // the point snapped to a crossing edge: skip
          const r = planRoute(g, a, b, 'dest', mode);
          if (!r) { inc('null route (' + (edgeReversible(g, e, mode) ? 'two-way' : 'one-way') + ')'); continue; }
          inc('routes');
          const direct = r.legs.length === 1 || r.legs.every((l) => l.edge === e);
          if (!direct) { inc('left the edge'); continue; }
          if (r.steps[0].maneuver !== 'depart' || r.steps[r.steps.length - 1].maneuver !== 'arrive') inc('BAD step ends');
          const named = edgeNameOf(g, e);
          if (r.steps[0].road !== named) { inc('depart road != edge name'); if (ex.length < 3) ex.push({ e, fa, fb, text: instructionFor(r.steps[0], 'dest'), edgeName: named }); }
          if (r.steps.length !== 2) { inc('steps != 2'); if (ex.length < 6) ex.push({ e, fa, fb, steps: r.steps.map((s) => instructionFor(s, 'dest') + '@' + s.startDist.toFixed(1)) }); }
          const exp = Math.abs(sb.offset - sa.offset);
          if (Math.abs(r.distanceM - exp) > 0.5) inc('distance != |dOffset|');
          // heading vs the direction of travel
          const L = Math.min(30, r.distanceM);
          if (L > 1 && r.steps[0].heading) {
            const pts = edgeSlice(g, e, sa.offset, sa.offset + (sb.offset >= sa.offset ? L : -L));
            const bb = bearing(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], g.kx);
            if (idxDiff(COMPASS.indexOf(r.steps[0].heading), Math.round(bb / 45) % 8) > 1) { inc('heading off by >45deg'); }
          }
        }
      }
      rows.push(`${island} ${mode}: ${JSON.stringify(st)} ${JSON.stringify(ex)}`);
    }
  }
  console.log(rows.join('\n'));
});
