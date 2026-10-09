/* Temporary verification harness (deleted after use). Controls UI/JS thread interleavings for ZoomPan. */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StrictMode, useState } from 'react';
import { Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { IslandMap } from '@/ui/IslandMap';
import { ZoomPan } from '@/ui/ZoomPan';
import { IDENTITY, compose, type ViewTransform } from '@/ui/zoomMath';

export const C = { x: 150, y: 150 };
const W = require('react-native-worklets');
const origRN = W.scheduleOnRN;
const origUI = W.scheduleOnUI;
export const jsQ: { name: string; run: () => void }[] = [];
export const uiQ: { name: string; run: () => void }[] = [];
export const trace: string[] = [];
const ZP = new Set(['commit', 'release', 'start', 'swap']);
export let manual = true;
export function setManual(v: boolean) {
  manual = v;
}
const nameOf = (fn: any) => {
  if (typeof fn !== 'function') return '';
  const src = String(fn);
  if (src.includes('shown.set(') && src.includes('sent.set(null)')) return 'swap';
  if (src.includes('onCommit(')) return 'commit';
  if (src.includes('held: null')) return 'release';
  if (/onStart/.test(src) && src.length < 120) return 'start';
  return fn?.name ?? '';
};
W.scheduleOnRN = (fn: any, ...args: any[]) => {
  if (manual && ZP.has(nameOf(fn))) jsQ.push({ name: nameOf(fn) + '(' + JSON.stringify(args) + ')', run: () => fn(...args) });
  else origRN(fn, ...args);
};
W.scheduleOnUI = (fn: any, ...args: any[]) => {
  if (manual && ZP.has(nameOf(fn))) uiQ.push({ name: nameOf(fn) + '(' + JSON.stringify(args) + ')', run: () => fn(...args) });
  else origUI(fn, ...args);
};

export const api: { bump: () => void; setView: (v: ViewTransform) => void; props: any; unmount: () => void; rerenderOwner: (p?: any) => void } = {} as any;

export function Owner({ log, minScale = 0.01, maxScale = 100, kmin, kmax, margin = 0, marginFor, panEnabled = true, absorb = (t: ViewTransform, v: ViewTransform) => compose(t, v), onStart, W: w = 300, H: h = 300 }: any) {
  const [view, setView] = useState<ViewTransform>(IDENTITY);
  const [tick, setTick] = useState(0);
  api.bump = () => setTick((t) => t + 1);
  api.setView = (v) => setView(v);
  return (
    <ZoomPan
      width={w}
      height={h}
      margin={marginFor ? marginFor(view) : margin}
      minScale={kmin != null ? kmin / view.s : minScale}
      maxScale={kmax != null ? kmax / view.s : maxScale}
      panEnabled={panEnabled}
      onStart={onStart}
      onCommit={(t) => {
        log.push(t);
        setView((v) => {
          const n = absorb(t, v);
          return kmin != null ? { ...n, s: Math.min(kmax, Math.max(kmin, n.s)) } : n;
        });
      }}
      testID="zp">
      <Text testID="drawn" accessibilityLabel={JSON.stringify(view)}>{`${tick}`}</Text>
    </ZoomPan>
  );
}

export interface LayerInfo {
  opacity: number;
  pe: string | undefined;
  F: ViewTransform;
  drawn: ViewTransform | null;
  tick: string | null;
  box: { left: number; top: number; width: number; height: number };
}

export async function frame(ms = 20) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

export function readLayers(): LayerInfo[] {
  const root = screen.getByTestId('zp');
  return (root.children as any[]).map((el) => {
    const st: any = getAnimatedStyle(el);
    const tr = st.transform ?? [];
    const g = (k: string) => tr.find((x: any) => k in x)?.[k];
    const n: any = within(el).queryByTestId('drawn');
    return {
      opacity: st.opacity,
      pe: el.props.pointerEvents,
      F: { s: g('scale'), tx: g('translateX'), ty: g('translateY') },
      drawn: n ? JSON.parse(n.props.accessibilityLabel) : null,
      tick: n ? String(n.props.children) : null,
      box: { left: st.left, top: st.top, width: st.width, height: st.height },
    };
  });
}

export const shownIdx = (L: LayerInfo[]) => (L[0].opacity === 1 ? 0 : L[1].opacity === 1 ? 1 : -1);

/** Visual transform: finger transform applied after the shown drawing. */
export function visual(L: LayerInfo[]): ViewTransform | null {
  const i = shownIdx(L);
  if (i < 0) return null;
  const d = L[i].drawn;
  if (!d) return null;
  return compose(L[i].F, d);
}

// ---- UI thread (gesture handlers snapshot) ----
export const ui: { pan: any; pinch: any; tap: any } = { pan: null, pinch: null, tap: null };
export let TID = 'zp';
export function setTID(v: string) {
  TID = v;
}
export function snapshotHandlers() {
  return {
    pan: (getByGestureTestId(`${TID}-pan`) as any).handlers,
    pinch: (getByGestureTestId(`${TID}-pinch`) as any).handlers,
    tap: (getByGestureTestId(`${TID}-double-tap`) as any).handlers,
  };
}
export function syncHandlers() {
  const h = snapshotHandlers();
  ui.pan = h.pan;
  ui.pinch = h.pinch;
  ui.tap = h.tap;
}

export const panStart = () => ui.pan.onStart({ translationX: 0, translationY: 0 });
export const panMove = (dx: number, dy: number) => ui.pan.onUpdate({ translationX: dx, translationY: dy });
export const panEnd = () => ui.pan.onEnd({}, true);
export const pinchStart = (fx: number, fy: number) => ui.pinch.onStart({ focalX: fx, focalY: fy, scale: 1 });
export const pinchMove = (scale: number, fx: number, fy: number) => ui.pinch.onUpdate({ scale, focalX: fx, focalY: fy });
export const pinchEnd = () => ui.pinch.onEnd({}, true);
export const tapDouble = (x: number, y: number) => ui.tap.onEnd({ x, y }, true);

export const cov: Record<string, number> = {};
export const gs: { pan: boolean; pinch: boolean } = { pan: false, pinch: false };
const bump_ = (k: string) => (cov[k] = (cov[k] ?? 0) + 1);
export async function runUI(n = Infinity) {
  let i = 0;
  while (uiQ.length && i < n) {
    const t = uiQ.shift()!;
    trace.push('UI ' + t.name);
    const before = jsQ.length;
    t.run();
    if (t.name.startsWith('swap') ) {
      const acted = jsQ.slice(before).some((x) => x.name.startsWith('release'));
      if (acted) {
        bump_('swapActed');
        if (gs.pan && gs.pinch) bump_('swapDuringPanAndPinch');
        else if (gs.pan) bump_('swapDuringPan');
        else if (gs.pinch) bump_('swapDuringPinch');
        if (jsQ.slice(before).some((x) => x.name.startsWith('commit'))) bump_('dirtyFlushCommit');
      }
    }
    i++;
  }
  await frame();
  return i;
}
export let installs = true;
export function setInstalls(v: boolean) {
  installs = v;
}
/** After a React render: RNGH's passive effect hands the new gesture callbacks to the UI thread (behind the render's swap). */
export function pushInstall() {
  if (!installs) return;
  const h = snapshotHandlers();
  uiQ.push({
    name: 'install',
    run: () => {
      ui.pan = h.pan;
      ui.pinch = h.pinch;
      ui.tap = h.tap;
    },
  });
}
export async function runJS(n = Infinity) {
  let i = 0;
  while (jsQ.length && i < n) {
    const t = jsQ.shift()!;
    trace.push('JS ' + t.name);
    await act(async () => {
      t.run();
    });
    pushInstall();
    i++;
  }
  await frame();
  return i;
}
/** Drain everything: JS, UI, and handler sync until nothing is left. */
export async function drain(max = 50) {
  for (let i = 0; i < max; i++) {
    const a = await runJS();
    const b = await runUI();
    await frame(300);
    if (!a && !b && !jsQ.length && !uiQ.length) return;
  }
  throw new Error('drain did not settle: js=' + jsQ.map((x) => x.name) + ' ui=' + uiQ.map((x) => x.name));
}

export let rendered: any = null;
export async function mount(log: ViewTransform[], props: any = {}) {
  jsQ.length = 0;
  uiQ.length = 0;
  trace.length = 0;
  const { strict, ...rest } = props;
  rendered = await render(strict ? <StrictMode><Owner log={log} {...rest} /></StrictMode> : <Owner log={log} {...rest} />);
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  syncHandlers();
  await runUI();
  await runJS();
  syncHandlers();
}

export function close(a: ViewTransform | null, b: ViewTransform, eps = 1e-6) {
  if (!a) return false;
  return Math.abs(a.s - b.s) < eps && Math.abs(a.tx - b.tx) < eps && Math.abs(a.ty - b.ty) < eps;
}
export const fmt = (t: ViewTransform | null) => (t ? `{s:${t.s.toFixed(4)}, tx:${t.tx.toFixed(3)}, ty:${t.ty.toFixed(3)}}` : 'null');
export { IDENTITY, compose };


import { anchored, contentAt } from '@/ui/zoomMath';

jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Result {
  ok: boolean;
  seed: number;
  why?: string;
  steps: string[];
}

async function fuzzOnce(seed: number, nSteps: number, opts: { alwaysSync?: boolean; lagSync?: number; bump?: boolean; margin?: number } = {}): Promise<Result> {
  const r = rng(seed);
  const log: ViewTransform[] = [];
  const steps: string[] = [];
  await mount(log, { margin: opts.margin ?? 0 });
  let G: ViewTransform = { ...IDENTITY };
  let pan: null | { G0: ViewTransform; dx: number; dy: number } = null;
  let pinch: null | { q: { x: number; y: number }; s0: number; scale: number; fx: number; fy: number } = null;
  const rand = (lo: number, hi: number) => lo + (hi - lo) * r();
  const fail = (why: string): Result => ({ ok: false, seed, why, steps });

  let prevI = 0;
  let prevDrawn: ViewTransform | null = IDENTITY;
  const check = async (label: string): Promise<string | null> => {
    await frame();
    const L = readLayers();
    const i = shownIdx(L);
    if (i < 0) return `${label}: no layer shown (opacities ${L.map((l) => l.opacity)})`;
    if (!L[i].drawn) return `${label}: shown layer ${i} is BLANK`;
    const V = visual(L)!;
    const sameLayerDifferentDrawing = i === prevI && prevDrawn && !close(L[i].drawn, prevDrawn);
    prevI = i;
    prevDrawn = L[i].drawn;
    if (!close(V, G, 1e-5)) return `${sameLayerDifferentDrawing ? 'STALE_HELD ' : 'OTHER '}${label}: visual ${fmt(V)} != expected ${fmt(G)}`;
    return null;
  };
  let lagLeft = 0;

  for (let n = 0; n < nSteps; n++) {
    const choices: string[] = [];
    if (!pan && !pinch) choices.push('panStart', 'panStart', 'pinchStart', 'pinchStart');
    if (pan) choices.push('panMove', 'panMove', 'panEnd');
    if (pinch) choices.push('pinchMove', 'pinchMove', 'pinchEnd');
    if (uiQ.length) choices.push('ui', 'ui', 'ui');
    if (jsQ.length) choices.push('js', 'js', 'js');
    choices.push('sync');
    if (opts.bump) choices.push('bump');
    const c = choices[Math.floor(r() * choices.length)];
    steps.push(c);
    if (c === 'panStart') {
      panStart();
      pan = { G0: { ...G }, dx: 0, dy: 0 };
    } else if (c === 'panMove') {
      pan!.dx += rand(-40, 40);
      pan!.dy += rand(-40, 40);
      panMove(pan!.dx, pan!.dy);
      G = { s: pan!.G0.s, tx: pan!.G0.tx + pan!.dx, ty: pan!.G0.ty + pan!.dy };
    } else if (c === 'panEnd') {
      panEnd();
      pan = null;
    } else if (c === 'pinchStart') {
      const fx = rand(20, 280);
      const fy = rand(20, 280);
      pinchStart(fx, fy);
      pinch = { q: contentAt(G, { x: fx, y: fy }, C), s0: G.s, scale: 1, fx, fy };
    } else if (c === 'pinchMove') {
      pinch!.scale = Math.min(4, Math.max(0.3, pinch!.scale * rand(0.7, 1.4)));
      pinch!.fx = Math.min(290, Math.max(10, pinch!.fx + rand(-20, 20)));
      pinch!.fy = Math.min(290, Math.max(10, pinch!.fy + rand(-20, 20)));
      pinchMove(pinch!.scale, pinch!.fx, pinch!.fy);
      G = anchored(pinch!.q, { x: pinch!.fx, y: pinch!.fy }, pinch!.s0 * pinch!.scale, C);
    } else if (c === 'pinchEnd') {
      pinchEnd();
      pinch = null;
    } else if (c === 'ui') {
      await runUI(1);
    } else if (c === 'js') {
      await runJS(1);
    } else if (c === 'sync') {
      syncHandlers();
    } else if (c === 'bump') {
      await act(async () => {
        api.bump();
      });
    }
    if (opts.alwaysSync) syncHandlers();
    if (opts.lagSync) {
      if (c === 'js' || c === 'bump') lagLeft = opts.lagSync;
      else if (lagLeft > 0) {
        lagLeft--;
        if (lagLeft === 0) syncHandlers();
      }
    }
    const why = await check(`step ${n} (${c})`);
    if (why) return fail(why);
  }
  // finish gestures and drain
  if (pan) {
    panEnd();
    pan = null;
  }
  if (pinch) {
    pinchEnd();
    pinch = null;
  }
  steps.push('(finish)');
  await drain();
  const why = await check('final');
  if (why) return fail(why);
  const L = readLayers();
  const live = L.findIndex((l) => l.pe === 'box-none');
  const other = 1 - live;
  if (L[other].drawn) return fail(`final: held layer ${other} still has content`);
  if (shownIdx(L) !== live) return fail(`final: shown ${shownIdx(L)} != live ${live}`);
  // the drawing accounts for (almost) everything: finger transform is identity-ish
  const F = L[live].F;
  if (!(Math.abs(F.s - 1) < 1e-3 && Math.abs(F.tx) < 0.51 && Math.abs(F.ty) < 0.51)) return fail(`final: leftover finger transform ${fmt(F)}`);
  return { ok: true, seed, steps };
}

test('fuzz: no gesture interleaving makes the picture jump (fresh handlers)', async () => {
  const bad: Result[] = [];
  for (let seed = 1; seed <= 120; seed++) {
    const res = await fuzzOnce(seed, 60, { bump: true, alwaysSync: true });
    if (!res.ok) bad.push(res);
  }
  if (bad.length) {
    console.log('FAILURES', bad.length, bad.slice(0, 5).map((b) => `seed ${b.seed}: ${b.why}\n  steps: ${b.steps.join(',')}`).join('\n'));
  }
  expect(bad.length).toBe(0);
}, 600000);

const LAG = Number(process.env.ZZ_LAG ?? 2);
test('fuzz with handler lag: classify failures', async () => {
  const kinds: Record<string, number> = {};
  const examples: Record<string, string> = {};
  for (let seed = 1; seed <= 200; seed++) {
    const res = await fuzzOnce(seed, 60, { bump: true, lagSync: LAG });
    if (!res.ok) {
      const k = res.why!.split(' ')[0];
      kinds[k] = (kinds[k] ?? 0) + 1;
      examples[k] ??= `seed ${seed}: ${res.why}\n  steps: ${res.steps.join(',')}`;
    }
  }
  console.log('KINDS', JSON.stringify(kinds), '\n', Object.values(examples).join('\n'));
}, 600000);

test('margin change at commit: the shown (held) layer is re-framed before the swap', async () => {
  const log: ViewTransform[] = [];
  // like IslandMap: no margin on the whole island, a margin once zoomed in
  await mount(log, { marginFor: (v: ViewTransform) => (v.s > 1.01 ? 40 : 0) });
  syncHandlers();
  pinchStart(150, 150);
  pinchMove(2, 150, 150);
  pinchEnd();
  await frame();
  let L = readLayers();
  console.log('before commit render: shown', shownIdx(L), 'box0', JSON.stringify(L[0].box), 'box1', JSON.stringify(L[1].box));
  await runJS(); // start + commit -> render with new margin
  L = readLayers();
  console.log('after commit render, before swap: opacities', L.map((l) => l.opacity), 'boxes', JSON.stringify(L.map((l) => l.box)), 'drawn', JSON.stringify(L.map((l) => l.drawn)), 'uiQ', uiQ.map((x) => x.name));
  await runUI();
  L = readLayers();
  console.log('after swap: opacities', L.map((l) => l.opacity), 'boxes', JSON.stringify(L.map((l) => l.box)));
});


import { clamp, zoomAbout } from '@/ui/zoomMath';

interface Opts {
  lag?: number; // (unused)
  eager?: number; // probability of draining the UI queue after each action
  bump?: boolean;
  sim?: boolean; // simultaneous pan + pinch
  tap?: boolean; // double taps
  kmin?: number;
  kmax?: number;
  marginFor?: (v: ViewTransform) => number;
}

async function fuzz2(seed: number, nSteps: number, o: Opts = {}): Promise<Result> {
  const r = rng(seed);
  const log: ViewTransform[] = [];
  const steps: string[] = [];
  await mount(log, { kmin: o.kmin, kmax: o.kmax, marginFor: o.marginFor, strict: (global as any).__strict });
  const lo = o.kmin ?? 0.01;
  const hi = o.kmax ?? 100;
  let G: ViewTransform = { ...IDENTITY };
  let pan: null | { bx: number; by: number; dx: number; dy: number } = null;
  let pinch: null | { q: { x: number; y: number }; s0: number; scale: number; fx: number; fy: number } = null;
  const rand = (a: number, b: number) => a + (b - a) * r();
  const fail = (why: string): Result => ({ ok: false, seed, why, steps });
  let prevI = 0;
  let prevDrawn: ViewTransform | null = IDENTITY;
  let lagLeft = 0;

  const check = async (label: string, expect: ViewTransform = G): Promise<string | null> => {
    await frame();
    const L = readLayers();
    const i = shownIdx(L);
    if (i < 0) return `OTHER ${label}: no layer shown (opacities ${L.map((l) => l.opacity)})`;
    if (!L[i].drawn) return `OTHER ${label}: shown layer ${i} is BLANK`;
    const V = visual(L)!;
    const sameLayerDifferentDrawing = i === prevI && prevDrawn && !close(L[i].drawn, prevDrawn);
    prevI = i;
    prevDrawn = L[i].drawn;
    if (!close(V, expect, 1e-5)) return `${sameLayerDifferentDrawing ? 'STALE_HELD' : 'OTHER'} ${label}: visual ${fmt(V)} != expected ${fmt(expect)}`;
    return null;
  };

  for (let n = 0; n < nSteps; n++) {
    const choices: string[] = [];
    if (!pan && !pinch) choices.push('panStart', 'panStart', 'pinchStart', 'pinchStart');
    if (o.sim && pan && !pinch) choices.push('pinchStart');
    if (pan) choices.push('panMove', 'panMove', 'panEnd');
    if (pinch) choices.push('pinchMove', 'pinchMove', 'pinchEnd');
    if (o.tap && !pan && !pinch) choices.push('tap', 'tap');
    if (uiQ.length) choices.push('ui', 'ui', 'ui');
    if (jsQ.length) choices.push('js', 'js', 'js');
    if (o.bump) choices.push('bump');
    gs.pan = !!pan;
    gs.pinch = !!pinch;
    const c = choices[Math.floor(r() * choices.length)];
    steps.push(c);
    if (c === 'panStart') {
      panStart();
      pan = { bx: G.tx, by: G.ty, dx: 0, dy: 0 };
    } else if (c === 'panMove') {
      pan!.dx += rand(-40, 40);
      pan!.dy += rand(-40, 40);
      panMove(pan!.dx, pan!.dy);
      if (!pinch) G = { s: G.s, tx: pan!.bx + pan!.dx, ty: pan!.by + pan!.dy };
    } else if (c === 'panEnd') {
      panEnd();
      pan = null;
    } else if (c === 'pinchStart') {
      const fx = rand(20, 280);
      const fy = rand(20, 280);
      pinchStart(fx, fy);
      pinch = { q: contentAt(G, { x: fx, y: fy }, C), s0: G.s, scale: 1, fx, fy };
    } else if (c === 'pinchMove') {
      pinch!.scale = Math.min(5, Math.max(0.2, pinch!.scale * rand(0.7, 1.4)));
      pinch!.fx = Math.min(290, Math.max(10, pinch!.fx + rand(-20, 20)));
      pinch!.fy = Math.min(290, Math.max(10, pinch!.fy + rand(-20, 20)));
      pinchMove(pinch!.scale, pinch!.fx, pinch!.fy);
      G = anchored(pinch!.q, { x: pinch!.fx, y: pinch!.fy }, clamp(pinch!.s0 * pinch!.scale, lo, hi), C);
    } else if (c === 'pinchEnd') {
      pinchEnd();
      pinch = null;
      if (pan) {
        // implementation: baseTx = tx - panX  (pan carries on from here)
        pan.bx = G.tx - pan.dx;
        pan.by = G.ty - pan.dy;
      }
    } else if (c === 'tap') {
      const x = rand(20, 280);
      const y = rand(20, 280);
      tapDouble(x, y);
      await frame(300);
      const L = readLayers();
      const V = visual(L);
      const factor = clamp(G.s * 2, lo, hi) / G.s;
      const want = factor > 1.001 ? zoomAbout(G, { x, y }, factor, C) : G;
      // either dropped (visual unchanged) or accepted (exactly the expected zoom)
      if (close(V, G, 1e-5)) {
        steps.push('(tap dropped)');
      } else if (close(V, want, 1e-5)) {
        G = want;
      } else {
        return fail(`OTHER step ${n} (tap): visual ${fmt(V)} is neither unchanged ${fmt(G)} nor expected zoom ${fmt(want)}`);
      }
    } else if (c === 'ui') {
      await runUI(1);
    } else if (c === 'js') {
      await runJS(1);
    } else if (c === 'bump') {
      await act(async () => {
        api.bump();
      });
      pushInstall();
    }
    if (o.eager && r() < o.eager) await runUI();
    const why = await check(`step ${n} (${c})`);
    if (why) return fail(why);
  }
  if (pan) panEnd();
  if (pinch) pinchEnd();
  steps.push('(finish)');
  await drain();
  const why = await check('final');
  if (why) return fail(why);
  const L = readLayers();
  const live = L.findIndex((l) => l.pe === 'box-none');
  if (L[1 - live].drawn) return fail(`OTHER final: held layer ${1 - live} still has content`);
  if (shownIdx(L) !== live) return fail(`OTHER final: shown ${shownIdx(L)} != live ${live}`);
  const F = L[live].F;
  if (!(Math.abs(F.s - 1) < 1e-3 && Math.abs(F.tx) < 0.51 && Math.abs(F.ty) < 0.51)) return fail(`OTHER final: leftover finger transform ${fmt(F)}`);
  return { ok: true, seed, steps };
}

async function runFuzz2(name: string, seeds: number, n: number, o: Opts) {
  const kinds: Record<string, number> = {};
  const examples: Record<string, string> = {};
  for (let seed = 1; seed <= seeds; seed++) {
    const res = await fuzz2(seed, n, o);
    if (!res.ok) {
      const k = res.why!.split(' ')[0];
      kinds[k] = (kinds[k] ?? 0) + 1;
      examples[k] ??= `seed ${seed}: ${res.why}\n  steps: ${res.steps.join(',')}`;
    }
  }
  console.log(`FUZZ2 ${name}`, JSON.stringify(kinds), '\n' + Object.values(examples).join('\n'));
  return kinds;
}

test('fuzz2 FIFO UI queue (installs behind swaps): simultaneous gestures + double taps + relative limits', async () => {
  const k1 = await runFuzz2('fifo/sim/tap/limits', 150, 70, { bump: true, sim: true, tap: true, kmin: 0.5, kmax: 6 });
  expect(Object.keys(k1)).toEqual([]);
}, 900000);




test('fuzz2 eager UI (UI queue drained after 90% of actions)', async () => {
  const k = await runFuzz2('eager90/sim/tap/limits', 200, 70, { bump: true, sim: true, tap: true, kmin: 0.5, kmax: 6, eager: 0.9 });
  console.log('kinds', JSON.stringify(k));
}, 900000);

test('fuzz2 eager UI 99%', async () => {
  for (const k of Object.keys(cov)) delete cov[k];
  const k = await runFuzz2('eager99/sim/tap/limits', 200, 70, { bump: true, sim: true, tap: true, kmin: 0.5, kmax: 6, eager: 0.99 });
  console.log('kinds', JSON.stringify(k), 'coverage', JSON.stringify(cov));
}, 900000);


test('StrictMode: fuzz (eager)', async () => {
  const spy = jest.spyOn(console, 'error');
  const orig = fuzz2;
  const kinds: Record<string, number> = {};
  const examples: Record<string, string> = {};
  for (let seed = 1; seed <= 60; seed++) {
    const r = rng(seed);
    // reuse fuzz2 but mount in StrictMode: monkeypatch mount via global flag
    (global as any).__strict = true;
    const res = await orig(seed, 60, { bump: true, sim: true, tap: true, kmin: 0.5, kmax: 6, eager: 0.95 });
    (global as any).__strict = false;
    if (!res.ok) {
      const k = res.why!.split(' ')[0];
      kinds[k] = (kinds[k] ?? 0) + 1;
      examples[k] ??= `seed ${seed}: ${res.why}\n  steps: ${res.steps.join(',')}`;
    }
  }
  console.log('STRICT kinds', JSON.stringify(kinds), Object.values(examples).join('\n'), 'console.error calls:', spy.mock.calls.length, JSON.stringify(spy.mock.calls.slice(0, 3)).slice(0, 600));
}, 900000);

test('double tap while a commit is in flight is dropped; works again once the swap has landed', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  panStart();
  panMove(60, 0);
  panEnd();
  await frame();
  console.log('commit in flight; jsQ', jsQ.map((x) => x.name));
  tapDouble(200, 150);
  await frame(300);
  console.log('after double tap during flight: V', fmt(visual(readLayers())), 'jsQ', jsQ.map((x) => x.name));
  await drain();
  console.log('after drain: V', fmt(visual(readLayers())), 'log', JSON.stringify(log));
  tapDouble(200, 150);
  await frame(300);
  console.log('double tap after landing: V', fmt(visual(readLayers())), 'jsQ', jsQ.map((x) => x.name));
  await drain();
  console.log('final V', fmt(visual(readLayers())), 'log', JSON.stringify(log));
});

test('unmount while a commit is in flight: late commit/swap/release do not throw or warn', async () => {
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const log: ViewTransform[] = [];
  await mount(log);
  panStart();
  panMove(60, 0);
  panEnd();
  await runJS(1); // start only
  console.log('queued before unmount: js', jsQ.map((x) => x.name), 'ui', uiQ.map((x) => x.name));
  setInstalls(false);
  rendered.unmount();
  let threw: any = null;
  try {
    await runJS(); // late commit -> setState on an unmounted tree
    await runUI(); // swap posted before unmount, if any
    await runJS(); // release
    await frame(300);
  } catch (e) {
    threw = e;
  }
  console.log('late tasks threw:', threw, 'log', JSON.stringify(log), 'console.error', err.mock.calls.length, JSON.stringify(err.mock.calls).slice(0, 1500), 'warn', warn.mock.calls.length);
  setInstalls(true);
  err.mockRestore();
  warn.mockRestore();
});



// ---------------- Real IslandMap integration ----------------
async function mountIsland(props: any = {}) {
  setTID('island-map');
  jsQ.length = 0;
  uiQ.length = 0;
  trace.length = 0;
  rendered = await render(<IslandMap island="saipan" shelters={[]} location={null} width={358} height={286} {...props} />);
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  syncHandlers();
  await runUI();
  await runJS();
  syncHandlers();
}

function readIsland() {
  const root = screen.getByTestId('island-map');
  return (root.children as any[]).map((el) => {
    const st: any = getAnimatedStyle(el);
    const tr = st.transform ?? [];
    const g = (k: string) => tr.find((x: any) => k in x)?.[k];
    const svg = el.children?.[0];
    return {
      opacity: st.opacity,
      pe: el.props.pointerEvents,
      F: { s: g('scale'), tx: g('translateX'), ty: g('translateY') },
      box: { left: st.left, top: st.top, width: st.width, height: st.height },
      svg: svg ? { w: svg.props.width, h: svg.props.height } : null,
    };
  });
}
const islandLabel = () => screen.getByTestId('island-map').parent!.props.accessibilityLabel as string;

test('IslandMap: first zoom-in commit - what is visible while the new drawing is being swapped in', async () => {
  await mountIsland();
  console.log('start', JSON.stringify(readIsland()), islandLabel());
  pinchStart(179, 143);
  pinchMove(3, 179, 143);
  pinchEnd();
  await frame();
  console.log('pinch ended, before commit', JSON.stringify(readIsland()));
  await runJS();
  console.log('commit rendered, swap not yet run:', JSON.stringify(readIsland()), '|', islandLabel(), '| uiQ', uiQ.map((x) => x.name));
  await runUI();
  console.log('after swap', JSON.stringify(readIsland()));
  await runJS();
  console.log('after release', JSON.stringify(readIsland()));
  setTID('zp');
});

test('IslandMap: "All of Saipan" pressed while a pinch commit is in flight', async () => {
  await mountIsland();
  // zoom in once and let everything land
  pinchStart(179, 143);
  pinchMove(3, 179, 143);
  pinchEnd();
  await drain();
  console.log('zoomed in:', islandLabel(), JSON.stringify(readIsland().map((l) => ({ o: l.opacity, F: l.F, svg: l.svg }))));
  // a second pinch ends; its commit is in flight (not processed by JS yet)
  pinchStart(179, 143);
  pinchMove(1.5, 179, 143);
  pinchEnd();
  await frame();
  console.log('commit in flight; jsQ', jsQ.map((x) => x.name));
  // user taps "All of Saipan" now (JS processes the press before the commit)
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Show all of Saipan'));
  });
  console.log('after press (before commit runs):', islandLabel(), JSON.stringify(readIsland().map((l) => ({ o: l.opacity, F: l.F, svg: l.svg }))));
  await drain();
  console.log('after everything lands:', islandLabel(), JSON.stringify(readIsland().map((l) => ({ o: l.opacity, F: l.F, box: l.box, svg: l.svg }))), 'button present:', screen.queryByLabelText('Show all of Saipan') != null);
  setTID('zp');
});

test('IslandMap: zoom out to the whole island by pinch - what is visible between commit render and swap', async () => {
  await mountIsland();
  pinchStart(179, 143);
  pinchMove(3, 179, 143);
  pinchEnd();
  await drain();
  // now pinch out to (almost) the whole island
  pinchStart(179, 143);
  pinchMove(1 / 3, 179, 143);
  pinchEnd();
  await frame();
  await runJS();
  console.log('zoom-out commit rendered, swap not yet run:', islandLabel(), JSON.stringify(readIsland()), 'uiQ', uiQ.map((x) => x.name));
  await drain();
  console.log('landed:', islandLabel(), JSON.stringify(readIsland()));
  setTID('zp');
});

test('REPRO stale closure: a gesture that ends after swap but before the new gesture callbacks reach the UI thread', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  // Pan A: 100 right
  panStart();
  panMove(100, 0);
  panEnd();
  await runJS(); // start + commit(A) -> render R1 (live=1); posts swap(1) and then the new gesture callbacks (install)
  console.log('uiQ after commit render:', uiQ.map((x) => x.name));
  // UI thread: runs install(for 'start' task) then swap(1); the install of R1's callbacks is still queued behind
  while (uiQ.length && uiQ[0].name !== 'swap([1])') await runUI(1);
  await runUI(1); // swap(1)
  console.log('uiQ now (swap done, R1 callbacks not yet installed):', uiQ.map((x) => x.name));
  let L = readLayers();
  console.log('V after swap', fmt(visual(L)), 'shown', shownIdx(L), 'drawn', JSON.stringify(L.map((l) => l.drawn)));
  // Pan B: 50 down, handled by the OLD callbacks still installed on the UI thread
  panStart();
  panMove(0, 50);
  panEnd();
  await frame();
  console.log('V during pan B (expect {1, 100, 50})', fmt(visual(readLayers())));
  await runJS(); // release(1) + commit(B) from the stale closure
  L = readLayers();
  console.log('V after commit(B) rendered (expect {1,100,50})', fmt(visual(L)), 'shown', shownIdx(L), 'drawn(shown)', JSON.stringify(L[shownIdx(L)].drawn), 'drawn(all)', JSON.stringify(L.map((l) => l.drawn)));
  await drain();
  console.log('final V', fmt(visual(readLayers())));
});

import { COASTLINES } from '@/data/coastlines';
import { roadGraph } from '@/data/roads';
import { NavMap, type NavView } from '@/ui/NavMap';

function NavHost({ log }: { log: string[] }) {
  const [free, setFree] = useState<NavView | null>(null);
  const [follow, setFollow] = useState<NavView>({ center: { lat: 15.2071, lng: 145.7189 }, mpp: 2, anchorY: 0.62 });
  const view = free ?? follow;
  api.bump = () => setFollow((v) => ({ ...v, center: { ...v.center, lat: v.center.lat + 0.00001 } }));
  api.zoomButton = () => {
    // what navigate.tsx's zoomBy does in free mode: a plain (non-functional) set from the view on screen
    setFree({ ...view, mpp: view.mpp / 1.6 });
  };
  return (
    <NavMap
      width={390}
      height={760}
      graph={roadGraph('saipan')}
      coast={COASTLINES.saipan}
      route={null}
      along={0}
      user={null}
      destination={null}
      view={view}
      onInteract={() => {
        log.push('interact');
        setFree((f) => f ?? view);
      }}
      onViewChange={(update) => {
        log.push('viewChange');
        setFree((f) => update(f ?? view));
      }}
    />
  );
}
(api as any).zoomButton = () => {};

async function mountNav(log: string[]) {
  setTID('nav-map');
  jsQ.length = 0;
  uiQ.length = 0;
  trace.length = 0;
  rendered = await render(<NavHost log={log} />);
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
  syncHandlers();
  await runUI();
  await runJS();
}

test('NavMap integration: pan then pinch, each commits once; view matches what the fingers did', async () => {
  const log: string[] = [];
  await mountNav(log);
  const read = () => {
    const root = screen.getByTestId('nav-map');
    return (root.children as any[]).map((el) => {
      const st: any = getAnimatedStyle(el);
      const svg = el.children?.[0];
      return { o: st.opacity, pe: el.props.pointerEvents, box: `${st.left},${st.top},${st.width},${st.height}`, svg: svg ? `${svg.props.width}x${svg.props.height}` : null };
    });
  };
  console.log('start', JSON.stringify(read()));
  panStart();
  panMove(80, -40);
  panEnd();
  await drain();
  console.log('after pan', JSON.stringify(read()), log.join(','));
  pinchStart(195, 400);
  pinchMove(2, 195, 400);
  pinchEnd();
  await drain();
  console.log('after pinch', JSON.stringify(read()), log.join(','));
  tapDouble(100, 300);
  await frame(300);
  await drain();
  console.log('after double tap', JSON.stringify(read()), log.join(','));
  setTID('zp');
}, 120000);


