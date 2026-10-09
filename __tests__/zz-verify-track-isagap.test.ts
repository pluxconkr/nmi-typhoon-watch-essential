import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-isagap.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('Isa Drive gap sweep', () => {
  const g = roadGraph('saipan');
  const r = planRoute(g, { lat: 15.123441, lng: 145.70372 }, { lat: 15.155339, lng: 145.73919 }, 'genesis', 'drive')!;
  for (const G of [100, 200, 300, 400, 500, 1000, 2000]) {
    const failing: number[] = [];
    let n = 0;
    for (let s = 7000; s + G < r.distanceM - 600; s += 10) {
      n++;
      let prev = s;
      let bad = 0;
      for (let d = s + G; d <= Math.min(r.distanceM, s + G + 600); d += 13) {
        const t = trackRoute(r, pointAlong(r, d), g.kx, prev);
        prev = t.along;
        if (Math.abs(t.along - d) > 50) bad++;
      }
      if (bad >= 3) failing.push(s);
    }
    let a = -1, z = -1;
    const ranges: string[] = [];
    for (const s of failing) { if (a < 0) { a = z = s; } else if (s - z <= 10) z = s; else { ranges.push(`${a}-${z}`); a = z = s; } }
    if (a >= 0) ranges.push(`${a}-${z}`);
    log(`G=${G}: ${failing.length}/${n} gap start positions s in [7000, ...] wrong; ranges: ${ranges.join(', ')}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
