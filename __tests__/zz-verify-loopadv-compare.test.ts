import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeSlice } from '@/domain/roads';
import { planRoute as planFixed, reachByRoad } from '@/domain/routing';
import { planRoute as planOrig } from './zz-verify-loopadv-orig.test';
import { planRoute as planProp } from './zz-verify-loopadv-prop.test';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('offset 0 on one-way loops: pre-fix vs fixed vs proposed', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  const dests = ['kagman-high-school', 'garapan-elementary-school', 'marianas-high-school'].map((id) => list.find((s) => s.shelterId === id)!);
  for (const L of [1067, 3345]) {
    const N = g.edgeFrom[L];
    const starts = [
      { label: 'exact node (offset 0 on loop?)', p: { lat: g.nodeLat[N], lng: g.nodeLng[N] } },
      { label: '20% along loop', p: (() => { const [lat, lng] = edgeSlice(g, L, g.edgeLen[L] * 0.2, g.edgeLen[L] * 0.2)[0]; return { lat, lng }; })() },
    ];
    for (const st of starts) {
      for (const to of dests) {
        const reach = reachByRoad(g, st.p, [{ id: 'x', name: 'x', lat: to.lat, lng: to.lng }], 'drive')[0];
        const f = planFixed(g, st.p, to, to.name, 'drive')!;
        const o = planOrig(g, st.p, to, to.name, 'drive')!;
        const q = planProp(g, st.p, to, to.name, 'drive')!;
        out.push(
          `e${L} ${st.label} -> ${to.shelterId}: reach=${reach.distanceM.toFixed(1)} | fixed=${f.distanceM.toFixed(1)} (leg0 ${f.legs[0].edge}:${f.legs[0].from.toFixed(1)}->${f.legs[0].to.toFixed(1)}) | prefix=${o.distanceM.toFixed(1)} (leg0 ${o.legs[0].edge}:${o.legs[0].from.toFixed(1)}->${o.legs[0].to.toFixed(1)}) | proposed=${q.distanceM.toFixed(1)}`,
        );
      }
    }
  }
  console.log(out.join('\n'));
});
