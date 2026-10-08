import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf } from '@/domain/roads';
import { planRoute as planNew, instructionFor } from '@/domain/routing';
import { planRoute as planOld } from './zz-verify-depart-a8e2-oldcopy.test';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

const strip = (r: any) => JSON.stringify({ ...r, steps: r.steps.map((s: any) => s) });

test('old vs new across all node fixes', () => {
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const dests = list.filter((s) => s.island === island).slice(0, 3);
    for (const mode of ['drive', 'walk'] as const) {
      const stats: Record<string, number> = {};
      const inc = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
      const ex: Record<string, any[]> = {};
      const keep = (k: string, v: any) => { (ex[k] ??= []).length < 4 && ex[k].push(v); };
      for (let i = 0; i < g.nodeCount; i += (island === 'saipan' ? 3 : 1)) {
        const from = { lat: g.nodeLat[i], lng: g.nodeLng[i] };
        for (const d of dests) {
          const rn = planNew(g, from, d, d.name, mode);
          const ro = planOld(g, from, d, d.name, mode);
          if (!rn || !ro) { inc(rn || ro ? 'ONE NULL' : 'both null'); continue; }
          inc('routes');
          const L0 = Math.abs(rn.legs[0].to - rn.legs[0].from);
          const same = strip(rn) === strip(ro);
          if (L0 !== 0) {
            inc(same ? 'nonzero first leg: identical' : 'nonzero first leg: DIFFERENT');
            if (!same) keep('nonzero-diff', { i, d: d.shelterId });
            continue;
          }
          inc('zero first leg');
          if (same) { inc('zero: identical'); continue; }
          // polyline/legs must be identical, only steps may differ
          const geomSame = JSON.stringify([rn.lat, rn.lng, rn.cumDist, rn.cumTime, rn.legs]) === JSON.stringify([ro.lat, ro.lng, ro.cumDist, ro.cumTime, ro.legs]);
          if (!geomSame) inc('zero: GEOMETRY DIFFERS');
          const nn = rn.steps.length, no = ro.steps.length;
          const kind = nn < no ? 'zero: new has FEWER steps' : nn > no ? 'zero: new has MORE steps' : 'zero: same count, text differs';
          inc(kind);
          const sn = rn.steps.map((s) => `${instructionFor(s, d.name)}@${s.startDist.toFixed(0)}`);
          const so = ro.steps.map((s) => `${instructionFor(s, d.name)}@${s.startDist.toFixed(0)}`);
          // which steps differ beyond index 0 and 1?
          let deeper = false;
          for (let k = 2; k < Math.max(sn.length, so.length); k++) if (sn[k - (nn - no)] !== so[k]) { deeper = true; break; }
          if (nn === no) { for (let k = 2; k < nn; k++) if (sn[k] !== so[k]) deeper = true; }
          if (deeper) inc('zero: differs beyond first two steps');
          keep(kind, { i, d: d.shelterId, old: so.slice(0, 3), new: sn.slice(0, 3) });
        }
      }
      console.log(island, mode, JSON.stringify(stats), '\n', JSON.stringify(ex, null, 0));
    }
  }
});
