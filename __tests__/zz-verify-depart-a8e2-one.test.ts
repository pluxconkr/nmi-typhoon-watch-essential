import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];
const byId = (id: string) => list.find((s) => s.shelterId === id)!;

test('detail: node 67 -> kagman-high-school', () => {
  const g = roadGraph('saipan');
  const from = { lat: g.nodeLat[67], lng: g.nodeLng[67] };
  const d = byId('kagman-high-school');
  const sp = snapToRoad(g, from, 'drive', 500)!;
  console.log('snap', JSON.stringify(sp), 'edgeLen', g.edgeLen[sp.edge], 'name', edgeNameOf(g, sp.edge), 'from/to', g.edgeFrom[sp.edge], g.edgeTo[sp.edge]);
  const r = planRoute(g, from, d, d.name, 'drive')!;
  console.log('legs', JSON.stringify(r.legs.slice(0, 5).map((l) => ({ ...l, name: edgeNameOf(g, l.edge), len: Math.abs(l.to - l.from), eFrom: g.edgeFrom[l.edge], eTo: g.edgeTo[l.edge] }))));
  console.log('steps', JSON.stringify(r.steps.slice(0, 5).map((s) => ({ ...s, text: instructionFor(s, d.name) })), null, 1));
});
