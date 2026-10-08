import { roadGraph } from '@/data/roads';
import { snapToRoad } from '@/domain/roads';

test('survey: where do node-coordinate fixes snap relative to edge ends', () => {
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    for (const mode of ['drive', 'walk'] as const) {
      let n = 0;
      const buckets: Record<string, number> = {};
      const examples: Record<string, any[]> = {};
      const add = (k: string, ex: any) => {
        buckets[k] = (buckets[k] ?? 0) + 1;
        (examples[k] ??= []).length < 3 && examples[k].push(ex);
      };
      for (let i = 0; i < g.nodeCount; i++) {
        const p = snapToRoad(g, { lat: g.nodeLat[i], lng: g.nodeLng[i] }, mode, 50);
        if (!p) continue;
        n++;
        const len = g.edgeLen[p.edge];
        const dFrom = p.offset;
        const dTo = len - p.offset;
        let k: string;
        if (dFrom === 0) k = 'offset==0 exact';
        else if (dTo === 0) k = 'offset==len exact';
        else if (dFrom < 1e-6) k = 'offset in (0,1e-6)';
        else if (dTo < 1e-6) k = 'len-offset in (0,1e-6)';
        else if (dFrom < 1e-3) k = 'offset in [1e-6,1e-3)';
        else if (dTo < 1e-3) k = 'len-offset in [1e-6,1e-3)';
        else k = 'interior (>1mm from ends)';
        add(k, { node: i, edge: p.edge, offset: p.offset, len, distM: p.distM, dFrom, dTo });
      }
      console.log(island, mode, 'nodes', n, JSON.stringify(buckets), JSON.stringify(examples, null, 0));
    }
  }
});
