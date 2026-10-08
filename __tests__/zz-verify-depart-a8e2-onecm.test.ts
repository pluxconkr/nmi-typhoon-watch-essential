import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('existing 1cm-apart fixes', () => {
  const g = roadGraph('saipan');
  const k = byId('kagman-high-school');
  for (const p of [{ lat: 15.222878, lng: 145.783559 }, { lat: 15.222878, lng: 145.7835591 }]) {
    const sp = snapToRoad(g, p, 'drive', 500)!;
    const r = planRoute(g, p, k, k.name, 'drive')!;
    console.log(JSON.stringify(p), `snap=${edgeNameOf(g, sp.edge)} off=${sp.offset} len=${g.edgeLen[sp.edge]} distM=${sp.distM}`,
      '\n legs', r.legs.slice(0, 3).map((l) => `${edgeNameOf(g, l.edge)}(${Math.abs(l.to - l.from).toFixed(3)})`).join(' > '),
      '\n steps', r.steps.slice(0, 3).map((s) => `${instructionFor(s, k.name)} @${s.startDist.toFixed(1)}`).join(' | '));
  }
});
