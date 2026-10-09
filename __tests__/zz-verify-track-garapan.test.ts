import fs from 'fs';
import { roadGraph } from '@/data/roads';
import { planRoute, trackRoute, type Route } from '@/domain/routing';

const OUT = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad/track-garapan.txt';
const lines: string[] = [];
const log = (s: string) => lines.push(s);
const M = 111_320;

function pointAlong(r: Route, d: number) {
  let i = 1;
  while (i < r.cumDist.length - 1 && r.cumDist[i] < d) i++;
  const span = r.cumDist[i] - r.cumDist[i - 1];
  const t = span === 0 ? 0 : Math.max(0, Math.min(1, (d - r.cumDist[i - 1]) / span));
  return { lat: r.lat[i - 1] + t * (r.lat[i] - r.lat[i - 1]), lng: r.lng[i - 1] + t * (r.lng[i] - r.lng[i - 1]) };
}

test('Garapan -> Susupe store: where does the route approach itself', () => {
  const g = roadGraph('saipan');
  const r = planRoute(g, { lat: 15.207085, lng: 145.720861 }, { lat: 15.1577, lng: 145.709857 }, 'er-wholesale', 'drive')!;
  log(`L=${r.distanceM.toFixed(0)} pts=${r.lat.length}`);
  r.steps.forEach((s, i) => log(`step ${i}: ${s.maneuver} ${s.side ?? ''} road=${s.road} start=${s.startDist.toFixed(0)} end=${s.endDist.toFixed(0)}`));
  log(`start=(${r.lat[0]},${r.lng[0]}) end=(${r.lat[r.lat.length - 1]},${r.lng[r.lng.length - 1]}) destination=(${r.destination.lat},${r.destination.lng})`);
  // where does it approach itself within 30 m
  for (let a = 0; a <= r.distanceM; a += 10) {
    const p = pointAlong(r, a);
    for (let b = a + 440; b <= r.distanceM; b += 5) {
      const q = pointAlong(r, b);
      const m = Math.hypot((q.lat - p.lat) * M, (q.lng - p.lng) * M * g.kx);
      if (m < 30) { log(`self-approach: along ${a} and ${b} are ${m.toFixed(1)} m apart (loop length ${b - a} m)`); break; }
    }
  }
  fs.writeFileSync(OUT, lines.join('\n'));
});
