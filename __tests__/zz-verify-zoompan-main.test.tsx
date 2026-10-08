/* Temporary verification harness (deleted after use). Controls UI/JS thread interleavings for ZoomPan. */
import { act, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

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
const nameOf = (fn: any) => (typeof fn === 'function' && String(fn).includes('shown.set(live)') ? 'swap' : fn?.name ?? '');
W.scheduleOnRN = (fn: any, ...args: any[]) => {
  if (manual && ZP.has(nameOf(fn))) jsQ.push({ name: nameOf(fn) + '(' + JSON.stringify(args) + ')', run: () => fn(...args) });
  else origRN(fn, ...args);
};
W.scheduleOnUI = (fn: any, ...args: any[]) => {
  if (manual && ZP.has(nameOf(fn))) uiQ.push({ name: nameOf(fn) + '(' + JSON.stringify(args) + ')', run: () => fn(...args) });
  else origUI(fn, ...args);
};

export const api: { bump: () => void; setView: (v: ViewTransform) => void; props: any; unmount: () => void; rerenderOwner: (p?: any) => void } = {} as any;

export function Owner({ log, minScale = 0.01, maxScale = 100, margin = 0, panEnabled = true, absorb = (t: ViewTransform, v: ViewTransform) => compose(t, v), onStart, W: w = 300, H: h = 300 }: any) {
  const [view, setView] = useState<ViewTransform>(IDENTITY);
  const [tick, setTick] = useState(0);
  api.bump = () => setTick((t) => t + 1);
  api.setView = (v) => setView(v);
  return (
    <ZoomPan
      width={w}
      height={h}
      margin={margin}
      minScale={minScale}
      maxScale={maxScale}
      panEnabled={panEnabled}
      onStart={onStart}
      onCommit={(t) => {
        log.push(t);
        setView((v) => absorb(t, v));
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
export function snapshotHandlers() {
  return {
    pan: (getByGestureTestId('zp-pan') as any).handlers,
    pinch: (getByGestureTestId('zp-pinch') as any).handlers,
    tap: (getByGestureTestId('zp-double-tap') as any).handlers,
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

export async function runUI(n = Infinity) {
  let i = 0;
  while (uiQ.length && i < n) {
    const t = uiQ.shift()!;
    trace.push('UI ' + t.name);
    t.run();
    i++;
  }
  await frame();
  return i;
}
export async function runJS(n = Infinity) {
  let i = 0;
  while (jsQ.length && i < n) {
    const t = jsQ.shift()!;
    trace.push('JS ' + t.name);
    await act(async () => {
      t.run();
    });
    i++;
  }
  await frame();
  return i;
}
/** Drain everything: JS, UI, and handler sync until nothing is left. */
export async function drain(max = 50) {
  for (let i = 0; i < max; i++) {
    const a = await runJS();
    syncHandlers();
    const b = await runUI();
    await frame(300);
    if (!a && !b && !jsQ.length && !uiQ.length) return;
  }
  throw new Error('drain did not settle: js=' + jsQ.map((x) => x.name) + ' ui=' + uiQ.map((x) => x.name));
}

export async function mount(log: ViewTransform[], props: any = {}) {
  jsQ.length = 0;
  uiQ.length = 0;
  trace.length = 0;
  await render(<Owner log={log} {...props} />);
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

async function fuzzOnce(seed: number, nSteps: number, opts: { alwaysSync?: boolean; bump?: boolean; margin?: number } = {}): Promise<Result> {
  const r = rng(seed);
  const log: ViewTransform[] = [];
  const steps: string[] = [];
  await mount(log, { margin: opts.margin ?? 0 });
  let G: ViewTransform = { ...IDENTITY };
  let pan: null | { G0: ViewTransform; dx: number; dy: number } = null;
  let pinch: null | { q: { x: number; y: number }; s0: number; scale: number; fx: number; fy: number } = null;
  const rand = (lo: number, hi: number) => lo + (hi - lo) * r();
  const fail = (why: string): Result => ({ ok: false, seed, why, steps });

  const check = async (label: string): Promise<string | null> => {
    await frame();
    const L = readLayers();
    const i = shownIdx(L);
    if (i < 0) return `${label}: no layer shown (opacities ${L.map((l) => l.opacity)})`;
    if (!L[i].drawn) return `${label}: shown layer ${i} is BLANK`;
    const V = visual(L)!;
    if (!close(V, G, 1e-5)) return `${label}: visual ${fmt(V)} != expected ${fmt(G)}`;
    return null;
  };

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
