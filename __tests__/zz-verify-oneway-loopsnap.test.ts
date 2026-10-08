import { roadGraph } from '@/data/roads';
import { snapToRoad } from '@/domain/roads';

test('how often do fixes near the one-way loops snap to (loop, offset 0)?', () => {
  const g = roadGraph('saipan');
  const out: string[] = [];
  const M = 111320;
  for (const e of [1067, 3345]) {
    const n = g.edgeFrom[e];
    for (const radius of [1, 3, 5, 10, 20]) {
      let tot = 0, zeroLoop = 0, endLoop = 0, interiorLoop = 0, other = 0;
      let sample: { lat: number; lng: number } | null = null;
      for (let k = 0; k < 720; k++) {
        const ang = (k / 720) * 2 * Math.PI;
        for (const frac of [0.5, 1]) {
          const r = radius * frac;
          const pos = { lat: g.nodeLat[n] + (r * Math.cos(ang)) / M, lng: g.nodeLng[n] + (r * Math.sin(ang)) / (M * g.kx) };
          const s = snapToRoad(g, pos, 'drive')!;
          tot++;
          if (s.edge === e) {
            if (s.offset === 0) { zeroLoop++; sample ??= pos; }
            else if (s.offset === g.edgeLen[e]) endLoop++;
            else interiorLoop++;
          } else other++;
        }
      }
      out.push(`loop e${e} radius ${radius} m: ${tot} fixes -> loop@0: ${zeroLoop}, loop@end: ${endLoop}, loop interior: ${interiorLoop}, other edge: ${other}${sample ? ` e.g. (${sample.lat.toFixed(7)}, ${sample.lng.toFixed(7)})` : ''}`);
    }
  }
  console.log(out.join('\n'));
});
