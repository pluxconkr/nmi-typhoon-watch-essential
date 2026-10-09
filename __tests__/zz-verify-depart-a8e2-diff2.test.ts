import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, edgeSlice } from '@/domain/roads';
import { planRoute as planNew, instructionFor } from '@/domain/routing';
import { planRoute as planOld } from './zz-verify-depart-a8e2-oldcopy.test';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const sig = (s: any, name: string) => `${instructionFor(s, name)}@${s.startDist.toFixed(2)}|${s.maneuver}|${s.side}|${s.stayOn}`;

function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number, kx: number) {
  const dx = (bLng - aLng) * kx;
  const dy = bLat - aLat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

test('classify old/new differences for exact-zero first legs', () => {
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = list.filter((s) => s.island === island).slice(0, 3);
    for (const mode of ['drive', 'walk'] as const) {
      const stats: Record<string, number> = {};
      const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
      const ex: Record<string, any[]> = {};
      const keep = (k: string, v: any) => { (ex[k] ??= []).length < 5 && ex[k].push(v); };
      for (let i = 0; i < g.nodeCount; i += (island === 'saipan' ? 3 : 1)) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        for (const d of dests) {
          const rn = planNew(g, from, d, d.name, mode);
          const ro = planOld(g, from, d, d.name, mode);
          if (!rn || !ro) continue;
          const L0 = Math.abs(rn.legs[0].to - rn.legs[0].from);
          if (L0 !== 0) continue;
          inc('zero-first-leg routes');
          const sn = rn.steps.map((s) => sig(s, d.name));
          const so = ro.steps.map((s) => sig(s, d.name));
          if (JSON.stringify(sn) === JSON.stringify(so)) { inc('identical'); continue; }
          const headingSame = rn.steps[0].heading === ro.steps[0].heading;
          if (!headingSame) inc('HEADING DIFFERS');
          const tailNewFromIdx1 = JSON.stringify(sn.slice(1));
          if (sn.length === so.length && JSON.stringify(sn.slice(1)) === JSON.stringify(so.slice(1))) {
            inc('D1: only depart road differs');
            if (rn.steps[0].road === null && ro.steps[0].road !== null) {
              inc('D1a: new depart road is NULL, old had a name');
              // is the first non-zero leg collinear with the zero-length edge (a through road that lost its name)?
              const zl = rn.legs[0];
              const nz = rn.legs.find((l) => l.from !== l.to)!;
              keep('D1a', { i, mode, d: d.shelterId, oldRoad: ro.steps[0].road, newText: sn[0], next: sn[1], zeroEdge: zl.edge, secondEdge: nz.edge });
            } else if (ro.steps[0].road === null && rn.steps[0].road !== null) inc('D1b: new gained a name');
            else inc('D1c: renamed (both named)');
            continue;
          }
          if (sn.length === so.length - 1 && JSON.stringify(sn.slice(1)) === JSON.stringify(so.slice(2))) {
            inc('D2: new dropped the old step[1]');
            const old1 = ro.steps[1];
            if (old1.maneuver === 'continue' && old1.road === rn.steps[0].road) inc('D2a: dropped step was "continue onto <new depart road>" (as intended)');
            else { inc('D2b: dropped step was something else'); keep('D2b', { i, mode, d: d.shelterId, so: so.slice(0, 3), sn: sn.slice(0, 3) }); }
            continue;
          }
          inc('D4: other');
          keep('D4', { i, mode, d: d.shelterId, so: so.slice(0, 4), sn: sn.slice(0, 4) });
        }
      }
      console.log(island, mode, JSON.stringify(stats), '\n', JSON.stringify(ex, null, 0));
    }
  }
});
