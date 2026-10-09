/* TEMPORARY verification file (zz-verify-scc-*): compares the old (weakly connected) and new (SCC) road graphs. */
import fs from 'fs';

import shelters from '@/assets/data/shelters.json';
import supplies from '@/assets/data/supplies.json';
import { roadGraph } from '@/data/roads';
import type { IslandId } from '@/domain/geo';
import { VILLAGES } from '@/domain/places';
import { decodeRoadGraph, edgeReversible, edgeUsable, snapToRoad, type RoadGraph } from '@/domain/roads';
import { reachByRoad } from '@/domain/routing';

const SCR = '/private/tmp/claude-501/-Users-justiceserv-Codes-essential-congressional-apps-nmi-typhoon-watch/4bee4f11-fea8-4f44-a69f-abc3934438cd/scratchpad';
const BEFORE_DIR = `${SCR}/roads-before`;
const OUT = `${SCR}/verify-scc/ts-results.json`;
const ISLANDS: IslandId[] = ['saipan', 'tinian', 'rota'];
const REMOVED = [1035, 5013, 5014, 5918, 6093, 6094];

const oldGraph = (isl: IslandId): RoadGraph => decodeRoadGraph(JSON.parse(fs.readFileSync(`${BEFORE_DIR}/roads-${isl}.json`, 'utf8')), isl);

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Is the sub-network of drive-usable edges strongly connected (one-way respected)? Returns node counts. */
function strongness(g: RoadGraph) {
  const touched = new Set<number>();
  for (let e = 0; e < g.edgeCount; e++) if (edgeUsable(g, e, 'drive')) { touched.add(g.edgeFrom[e]); touched.add(g.edgeTo[e]); }
  const start = touched.values().next().value as number;
  const bfs = (forward: boolean) => {
    const seen = new Set<number>([start]);
    const q = [start];
    while (q.length) {
      const u = q.pop()!;
      for (let i = g.adjStart[u]; i < g.adjStart[u + 1]; i++) {
        const e = g.adjEdges[i];
        if (!edgeUsable(g, e, 'drive')) continue;
        const rev = edgeReversible(g, e, 'drive');
        // forward: travel u -> v. backward: travel v -> u.
        const outs: number[] = [];
        if (forward) {
          if (g.edgeFrom[e] === u) outs.push(g.edgeTo[e]);
          if (g.edgeTo[e] === u && rev) outs.push(g.edgeFrom[e]);
        } else {
          if (g.edgeTo[e] === u) outs.push(g.edgeFrom[e]);
          if (g.edgeFrom[e] === u && rev) outs.push(g.edgeTo[e]);
        }
        for (const v of outs) if (!seen.has(v)) { seen.add(v); q.push(v); }
      }
    }
    return seen;
  };
  const f = bfs(true);
  const b = bfs(false);
  return { touched, forwardReach: f.size, backwardReach: b.size, touchedCount: touched.size };
}

describe('scc verification', () => {
  test('graph-level invariants', () => {
    const report: any = {};
    for (const isl of ISLANDS) {
      const ga = roadGraph(isl);
      const gb = oldGraph(isl);
      expect(ga.nodeCount).toBe(gb.nodeCount);
      expect(ga.edgeCount).toBe(gb.edgeCount);
      const flagDiffs: number[] = [];
      for (let e = 0; e < ga.edgeCount; e++) {
        expect(ga.edgeFrom[e]).toBe(gb.edgeFrom[e]);
        expect(ga.edgeTo[e]).toBe(gb.edgeTo[e]);
        expect(ga.edgeLen[e]).toBe(gb.edgeLen[e]);
        if (ga.edgeFlags[e] !== gb.edgeFlags[e]) {
          flagDiffs.push(e);
          expect(ga.edgeFlags[e] ^ gb.edgeFlags[e]).toBe(64);
          expect(gb.edgeFlags[e] & 64).toBe(64);
        }
      }
      const sa = strongness(ga);
      const sb = strongness(gb);
      // maximality among retained edges: no drive edge (bit 4) without bit 6 has both endpoints in the main node set
      let nonMaximal = 0;
      for (let e = 0; e < ga.edgeCount; e++) {
        if ((ga.edgeFlags[e] & 16) && !edgeUsable(ga, e, 'drive') && sa.touched.has(ga.edgeFrom[e]) && sa.touched.has(ga.edgeTo[e])) nonMaximal++;
      }
      report[isl] = { flagDiffs, after: { touched: sa.touchedCount, fwd: sa.forwardReach, bwd: sa.backwardReach }, before: { touched: sb.touchedCount, fwd: sb.forwardReach, bwd: sb.backwardReach }, nonMaximal };
      expect(sa.forwardReach).toBe(sa.touchedCount);
      expect(sa.backwardReach).toBe(sa.touchedCount);
      expect(nonMaximal).toBe(0);
    }
    fs.writeFileSync(OUT.replace('ts-results', 'ts-graph'), JSON.stringify(report, null, 1));
    expect(report.saipan.flagDiffs).toEqual(REMOVED);
    expect(report.tinian.flagDiffs).toEqual([]);
    expect(report.rota.flagDiffs).toEqual([]);
  });
});

type Dest = { id: string; name: string; lat: number; lng: number; island: IslandId; kind: 'shelter' | 'store'; conf?: string };
const DESTS: Dest[] = [
  ...(shelters.shelters as any[]).map((s) => ({ id: `shelter:${s.shelterId}`, name: s.name, lat: s.lat, lng: s.lng, island: s.island as IslandId, kind: 'shelter' as const, conf: s.coordConfidence })),
  ...(supplies.stores as any[]).map((s) => ({ id: `store:${s.id}`, name: s.name, lat: s.lat, lng: s.lng, island: s.island as IslandId, kind: 'store' as const, conf: s.coordConfidence })),
];

describe('scc verification: destinations', () => {
  test('snap of every shelter and store, before vs after (drive and walk)', () => {
    const rows: any[] = [];
    let changed = 0;
    for (const d of DESTS) {
      const ga = roadGraph(d.island);
      const gb = oldGraph(d.island);
      for (const mode of ['drive', 'walk'] as const) {
        const a = snapToRoad(ga, d, mode);
        const b = snapToRoad(gb, d, mode);
        const same = a && b && a.edge === b.edge && Math.abs(a.offset - b.offset) < 1e-9;
        if (!same) {
          changed++;
          rows.push({ id: d.id, name: d.name, conf: d.conf, mode, before: b && { edge: b.edge, distM: +b.distM.toFixed(1) }, after: a && { edge: a.edge, distM: +a.distM.toFixed(1) } });
        }
        if (mode === 'drive') expect(a).not.toBeNull();
      }
    }
    fs.writeFileSync(OUT.replace('ts-results', 'ts-destsnap'), JSON.stringify({ total: DESTS.length, changed, rows }, null, 1));
    // eslint-disable-next-line no-console
    console.log(`destinations: ${DESTS.length}, snap changes: ${changed}\n` + rows.map((r) => JSON.stringify(r)).join('\n'));
  });
});

describe('scc verification: routes from many origins', () => {
  test('reachByRoad before vs after, sampled origins + dense clusters around the removed edges', () => {
    const rng = mulberry32(987654321);
    const M = 111_320;
    const summary: any = {};
    const worst: any[] = [];
    const lost: any[] = [];
    const changedRows: any[] = [];
    for (const isl of ISLANDS) {
      const ga = roadGraph(isl);
      const gb = oldGraph(isl);
      const targets = DESTS.filter((d) => d.island === isl).map((d) => ({ id: d.id, name: d.name, lat: d.lat, lng: d.lng }));
      const origins: { cls: string; lat: number; lng: number }[] = [];
      const step = isl === 'saipan' ? 20 : 8;
      for (let n = 0; n < ga.nodeCount; n += step) {
        origins.push({ cls: 'node', lat: ga.nodeLat[n], lng: ga.nodeLng[n] });
        const r = 60 * Math.sqrt(rng());
        const th = rng() * 2 * Math.PI;
        origins.push({ cls: 'node-jitter', lat: ga.nodeLat[n] + (r * Math.cos(th)) / M, lng: ga.nodeLng[n] + (r * Math.sin(th)) / (M * ga.kx) });
      }
      for (let e = 0; e < ga.edgeCount; e += isl === 'saipan' ? 30 : 12) {
        const s = ga.geomStart[e];
        const k = s + Math.floor(ga.geomCount[e] / 2);
        const r = 80 * Math.sqrt(rng());
        const th = rng() * 2 * Math.PI;
        origins.push({ cls: 'edge-mid', lat: ga.ptLat[k] + (r * Math.cos(th)) / M, lng: ga.ptLng[k] + (r * Math.sin(th)) / (M * ga.kx) });
      }
      for (const v of VILLAGES.filter((x) => x.island === isl)) origins.push({ cls: 'village', lat: v.lat, lng: v.lng });
      if (isl === 'saipan') {
        for (const e of REMOVED) {
          for (const f of [0, 0.5, 1]) {
            const s = ga.geomStart[e];
            const aLat = ga.ptLat[s];
            const aLng = ga.ptLng[s];
            const bLat = ga.ptLat[s + ga.geomCount[e] - 1];
            const bLng = ga.ptLng[s + ga.geomCount[e] - 1];
            const cLat = aLat + f * (bLat - aLat);
            const cLng = aLng + f * (bLng - aLng);
            for (const r of [0, 15, 40, 80, 150]) {
              for (let a = 0; a < (r === 0 ? 1 : 6); a++) {
                const th = (a * Math.PI) / 3 + 0.3;
                origins.push({ cls: 'removed-edge', lat: cLat + (r * Math.cos(th)) / M, lng: cLng + (r * Math.sin(th)) / (M * ga.kx) });
              }
            }
          }
        }
      }
      const st = { origins: origins.length, targets: targets.length, pairs: 0, lost: 0, gained: 0, bothUnreachable: 0, originSnapChanged: 0, originNullBefore: 0, originNullAfter: 0, equalPairs: 0, unexpectedDiff: 0, changedPairs: 0, worseGt100m: 0, worseGt500m: 0, worseGtRatio1_25: 0, maxIncreaseM: 0, maxDecreaseM: 0 } as any;
      const byClass: Record<string, { n: number; changed: number; lostOrigins: number }> = {};
      for (const o of origins) {
        const c = (byClass[o.cls] ??= { n: 0, changed: 0, lostOrigins: 0 });
        c.n++;
        const sa = snapToRoad(ga, o, 'drive');
        const sb = snapToRoad(gb, o, 'drive');
        const snapSame = !!sa && !!sb && sa.edge === sb.edge && Math.abs(sa.offset - sb.offset) < 1e-9;
        if (!snapSame) { st.originSnapChanged++; c.changed++; }
        if (!sb) st.originNullBefore++;
        if (!sa) st.originNullAfter++;
        const ra = new Map(reachByRoad(ga, o, targets, 'drive').map((r) => [r.id, r]));
        const rb = new Map(reachByRoad(gb, o, targets, 'drive').map((r) => [r.id, r]));
        let originLost = false;
        for (const t of targets) {
          st.pairs++;
          const a = ra.get(t.id);
          const b = rb.get(t.id);
          if (b && !a) { st.lost++; originLost = true; lost.push({ isl, origin: o, target: t.id, before: b }); continue; }
          if (!b && a) { st.gained++; continue; }
          if (!a && !b) { st.bothUnreachable++; continue; }
          const dd = a!.distanceM - b!.distanceM;
          if (snapSame) {
            if (Math.abs(dd) > 1e-6 || Math.abs(a!.durationS - b!.durationS) > 1e-9) { st.unexpectedDiff++; worst.push({ kind: 'UNEXPECTED', isl, origin: o, target: t.id, before: b, after: a }); }
            else st.equalPairs++;
          } else {
            st.changedPairs++;
            if (dd > st.maxIncreaseM) st.maxIncreaseM = dd;
            if (-dd > st.maxDecreaseM) st.maxDecreaseM = -dd;
            if (dd > 100) st.worseGt100m++;
            if (dd > 500) st.worseGt500m++;
            if (a!.distanceM > b!.distanceM * 1.25 && dd > 50) st.worseGtRatio1_25++;
            changedRows.push({ isl, cls: o.cls, o: [+o.lat.toFixed(6), +o.lng.toFixed(6)], sb: sb && { e: sb.edge, d: +sb.distM.toFixed(1) }, sa: sa && { e: sa.edge, d: +sa.distM.toFixed(1) }, t: t.id, dd: +dd.toFixed(1), before: +b!.distanceM.toFixed(1), after: +a!.distanceM.toFixed(1) });
            if (dd > 100 || a!.distanceM > b!.distanceM * 1.25) worst.push({ kind: 'worse', isl, origin: o, snapBefore: sb && { e: sb.edge, d: +sb.distM.toFixed(1) }, snapAfter: sa && { e: sa.edge, d: +sa.distM.toFixed(1) }, target: t.id, dd: +dd.toFixed(1), before: +b!.distanceM.toFixed(1), after: +a!.distanceM.toFixed(1) });
          }
        }
        if (originLost) c.lostOrigins++;
      }
      st.byClass = byClass;
      summary[isl] = st;
    }
    worst.sort((x, y) => (y.dd ?? 0) - (x.dd ?? 0));
    changedRows.sort((x, y) => y.dd - x.dd);
    fs.writeFileSync(OUT, JSON.stringify({ summary, lostCount: lost.length, lost: lost.slice(0, 40), worst: worst.slice(0, 60), topChanged: changedRows.slice(0, 25), bottomChanged: changedRows.slice(-10) }, null, 1));
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 1));
  });
});
