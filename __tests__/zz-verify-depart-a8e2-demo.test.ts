import shelters from '@/assets/data/shelters.json';
import { roadGraph } from '@/data/roads';
import { edgeNameOf, snapToRoad } from '@/domain/roads';
import { planRoute, instructionFor } from '@/domain/routing';
import { DEMO_POSITION_IDS, demoPositionFix } from '@/domain/demoPositions';
import type { Shelter } from '@/domain/types';

const list = shelters.shelters as Shelter[];

test('demo positions and every shelter on the same island', () => {
  const rows: string[] = [];
  for (const id of DEMO_POSITION_IDS) {
    const fix = demoPositionFix(id)!;
    const island = id === 'san-jose-tinian' ? 'tinian' : id === 'songsong-rota' ? 'rota' : 'saipan';
    const g = roadGraph(island);
    const sp = snapToRoad(g, fix, 'drive', 500);
    let bad = 0, deg = 0, n = 0;
    for (const mode of ['drive', 'walk'] as const) {
      for (const d of list.filter((s) => s.island === island)) {
        const r = planRoute(g, fix, d, d.name, mode);
        if (!r) continue;
        n++;
        const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
        const L0 = len(r.legs[0]);
        if (L0 < 1) deg++;
        const trueLeg = r.legs.find((l) => len(l) >= 1) ?? r.legs[0];
        if (r.steps[0].road !== edgeNameOf(g, trueLeg.edge)) bad++;
      }
    }
    rows.push(`${id} fix=${JSON.stringify([fix.lat, fix.lng])} snapOffset=${sp?.offset} len=${sp ? g.edgeLen[sp.edge] : null} distM=${sp?.distM.toFixed(1)} routes=${n} degenerate(<1m)=${deg} wrongDepartRoad=${bad}`);
  }
  console.log(rows.join('\n'));
});

test('every shelter as start (users sheltering in place then moving) to every other on the island', () => {
  const rows: string[] = [];
  for (const island of ['saipan', 'tinian', 'rota'] as const) {
    const g = roadGraph(island);
    const ss = list.filter((s) => s.island === island);
    let n = 0, deg = 0, bad = 0;
    const ex: any[] = [];
    for (const a of ss) for (const b of ss) {
      if (a === b) continue;
      for (const mode of ['drive', 'walk'] as const) {
        const r = planRoute(g, a, b, b.name, mode);
        if (!r) continue;
        n++;
        const len = (l: { from: number; to: number }) => Math.abs(l.to - l.from);
        if (len(r.legs[0]) < 1) deg++;
        const trueLeg = r.legs.find((l) => len(l) >= 1) ?? r.legs[0];
        if (r.steps[0].road !== edgeNameOf(g, trueLeg.edge)) { bad++; if (ex.length < 3) ex.push({ from: a.shelterId, to: b.shelterId, mode, text: instructionFor(r.steps[0], b.name), L0: len(r.legs[0]) }); }
      }
    }
    rows.push(`${island}: routes=${n} degenerate(<1m)=${deg} wrongDepartRoad=${bad} ${JSON.stringify(ex)}`);
  }
  console.log(rows.join('\n'));
});
