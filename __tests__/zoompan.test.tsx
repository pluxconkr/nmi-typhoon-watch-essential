/**
 * ZoomPan hands each finished gesture to its owner once, relative to what the owner has drawn — also when a
 * second gesture ends before the first has been drawn (the UI and JS threads interleave on a real phone).
 */
import { act, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { ZoomPan } from '@/ui/ZoomPan';
import { IDENTITY, compose, inverse, screenAt, zoomAbout, type ViewTransform } from '@/ui/zoomMath';

// Fake animation frames and timers (Reanimated), but keep microtasks real: React's act() relies on them.
jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });

const C = { x: 150, y: 150 };

/** An owner whose drawing is every committed transform applied in turn. */
function Owner({ log }: { log: ViewTransform[] }) {
  const [view, setView] = useState<ViewTransform>(IDENTITY);
  return (
    <ZoomPan
      width={300}
      height={300}
      minScale={0.01}
      maxScale={100}
      onCommit={(t) => {
        log.push(t);
        setView((v) => compose(t, v));
      }}
      testID="zp">
      <Text testID="drawn">{`${view.s.toFixed(3)} ${view.tx.toFixed(2)} ${view.ty.toFixed(2)}`}</Text>
    </ZoomPan>
  );
}

const drag = (dx: number, dy: number) => [
  { state: State.BEGAN },
  { state: State.ACTIVE, translationX: 0, translationY: 0 },
  { translationX: dx, translationY: dy },
  { state: State.END, translationX: dx, translationY: dy },
];
const pinch = (scale: number, focalX: number, focalY: number) => [
  { state: State.BEGAN, focalX, focalY },
  { state: State.ACTIVE, scale: 1, focalX, focalY },
  { scale, focalX, focalY },
  { state: State.END, scale, focalX, focalY },
];

/** Render the owner and let Gesture Handler attach the gestures. */
async function mount(log: ViewTransform[]) {
  await render(<Owner log={log} />);
  await act(async () => {
    jest.advanceTimersByTime(50);
  });
}

/** Let commits reach the owner, re-draw, and the UI thread re-base, until nothing is left in flight. */
async function settleAll() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  }
}

function expectDrawn(t: ViewTransform) {
  expect(screen.getByTestId('drawn').props.children).toBe(`${t.s.toFixed(3)} ${t.tx.toFixed(2)} ${t.ty.toFixed(2)}`);
}

function expectClose(a: ViewTransform, b: ViewTransform) {
  expect(a.s).toBeCloseTo(b.s, 6);
  expect(a.tx).toBeCloseTo(b.tx, 6);
  expect(a.ty).toBeCloseTo(b.ty, 6);
}

test('compose applies one transform after another, and inverse undoes one', () => {
  const t = { s: 2.2, tx: -35, ty: 80 };
  const u = { s: 1.4, tx: 25, ty: -10 };
  const p = { x: 40, y: 260 };
  const twice = screenAt(t, screenAt(u, p, C), C);
  const once = screenAt(compose(t, u), p, C);
  expect(once.x).toBeCloseTo(twice.x, 9);
  expect(once.y).toBeCloseTo(twice.y, 9);
  const back = screenAt(compose(t, inverse(t)), p, C);
  expect(back.x).toBeCloseTo(p.x, 9);
  expect(back.y).toBeCloseTo(p.y, 9);
});

test('a drag is committed once and drawn', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('zp-pan'), drag(80, -30));
  });
  await settleAll();
  expect(log).toHaveLength(1);
  expectClose(log[0], { s: 1, tx: 80, ty: -30 });
  expectDrawn({ s: 1, tx: 80, ty: -30 });
});

test('a second drag that ends before the first is drawn is not counted twice', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('zp-pan'), drag(100, 0));
    fireGestureHandler(getByGestureTestId('zp-pan'), drag(0, 50));
  });
  await settleAll();
  expect(log).toHaveLength(2);
  expectClose(log[0], { s: 1, tx: 100, ty: 0 });
  expectClose(log[1], { s: 1, tx: 0, ty: 50 });
  expectDrawn({ s: 1, tx: 100, ty: 50 });
});

test('a pinch that starts before a drag is drawn zooms about the fingers, not about a stale map', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('zp-pan'), drag(60, 0));
    fireGestureHandler(getByGestureTestId('zp-pinch'), pinch(2, 150, 150));
  });
  await settleAll();
  // What the user saw: moved 60 right, then doubled about the middle of the window.
  const seen = zoomAbout({ s: 1, tx: 60, ty: 0 }, C, 2, C);
  expect(log).toHaveLength(2);
  expectDrawn(seen);
});

test('double-tap zooms in about the tap and commits once', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('zp-double-tap'), [
      { state: State.BEGAN, x: 200, y: 150 },
      { state: State.ACTIVE, x: 200, y: 150 },
      { state: State.END, x: 200, y: 150 },
    ]);
  });
  await settleAll();
  expect(log).toHaveLength(1);
  expectClose(log[0], zoomAbout(IDENTITY, { x: 200, y: 150 }, 2, C));
});

test('a drag back to where it started commits nothing', async () => {
  const log: ViewTransform[] = [];
  await mount(log);
  await act(async () => {
    fireGestureHandler(getByGestureTestId('zp-pan'), [
      { state: State.BEGAN },
      { state: State.ACTIVE, translationX: 0, translationY: 0 },
      { translationX: 40, translationY: 10 },
      { translationX: 0, translationY: 0 },
      { state: State.END, translationX: 0, translationY: 0 },
    ]);
  });
  await settleAll();
  expect(log).toHaveLength(0);
});
