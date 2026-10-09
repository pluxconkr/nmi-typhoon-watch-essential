import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf } from '@/domain/roads';
import { islandAt } from '@/domain/geo';
import { VILLAGES } from '@/domain/places';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('villages and supply points as starts', () => {
  const starts: { name: string; lat: number; lng: number }[] = [];
  for (const v of VILLAGES) starts.push({ name: 'village ' + v.name, lat: v.lat, lng: v.lng });
  const sup: any = supplies;
  const arr: any[] = Array.isArray(sup) ? sup : sup.places ?? sup.supplies ?? sup.items ?? [];
  for (const s of arr) if (typeof s.lat === 'number') starts.push({ name: 'supply ' + (s.name ?? s.id), lat: s.lat, lng: s.lng });
  let n = 0, deg = 0, bad = 0;
  const ex: any[] = [];
  for (const st of starts) {
    const island = islandAt(st);
    if (!island) continue;
    const g = roadGraph(island);
    for (const d of list.filter((s) => s.island === island)) {
      for (const mode of ['drive', 'walk'] as const) {
        const r = planRoute(g, st, d, d.name, mode);
        if (!r) continue;
        n++;
        const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
        if (len(r.legs[0]) < 1e-3) deg++;
        const trueLeg = r.legs.find((l) => len(l) >= 1) ?? r.legs[0];
        if (r.steps[0].road !== edgeNameOf(g, trueLeg.edge)) { bad++; if (ex.length < 4) ex.push({ from: st.name, to: d.shelterId, mode, text: instructionFor(r.steps[0], d.name), L0: len(r.legs[0]) }); }
      }
    }
  }
  console.log(`starts=${starts.length} routes=${n} degenerate(<1mm)=${deg} wrongDepartRoad=${bad} ${JSON.stringify(ex)}`);
});
