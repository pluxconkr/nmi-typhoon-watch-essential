import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-geom.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('geometry of the Tinian Broadway route', () => {
  const g = roadGraph('tinian');
  const r = planRoute(g, { lat: 15.033935, lng: 145.647902 }, { lat: 15.014668, lng: 145.635747 }, 'there', 'drive')!;
  log(`route points=${r.lat.length} distance=${r.distanceM.toFixed(0)} duration=${r.durationS.toFixed(0)}`);
  r.steps.forEach((s, i) => log(`step ${i}: ${s.maneuver} ${s.side ?? ''} road=${s.road} start=${s.startDist.toFixed(0)} end=${s.endDist.toFixed(0)}`));
  // For each along d (every 100 m), distance to the nearest part of the route that is more than 400 m away in along.
  const M = 111_320;
  for (let d = 0; d <= r.distanceM; d += 100) {
    const p = pointAlong(r, d);
    let best = Infinity;
    let bestAlong = -1;
    for (let d2 = 0; d2 <= r.distanceM; d2 += 5) {
      if (Math.abs(d2 - d) < 400) continue;
      const q = pointAlong(r, d2);
      const m = Math.hypot((q.lat - p.lat) * M, (q.lng - p.lng) * M * g.kx);
      if (m < best) {
        best = m;
        bestAlong = d2;
      }
    }
    log(`d=${d} nearest-other-part=${best.toFixed(1)} m at along=${bestAlong}`);
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
