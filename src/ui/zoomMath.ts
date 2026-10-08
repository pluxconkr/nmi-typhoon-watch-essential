/**
 * Maths for pinch-zoom and pan of a map view. A transform T = { s, tx, ty } maps a content point p to the
 * screen point C + t + s·(p − C), where C is the centre of the map window (React Native scales views about
 * their centre). Worklet-safe: these run on the UI thread inside gesture callbacks and in plain JS tests.
 */

export interface ViewTransform {
  s: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

export const IDENTITY: ViewTransform = { s: 1, tx: 0, ty: 0 };

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/** Where transform `t` shows content point `p` on screen. */
export function screenAt(t: ViewTransform, p: Point, c: Point): Point {
  'worklet';
  return { x: c.x + t.tx + t.s * (p.x - c.x), y: c.y + t.ty + t.s * (p.y - c.y) };
}

/** The content point (in untransformed window coordinates) shown at screen point `f`. */
export function contentAt(t: ViewTransform, f: Point, c: Point): Point {
  'worklet';
  return { x: c.x + (f.x - c.x - t.tx) / t.s, y: c.y + (f.y - c.y - t.ty) / t.s };
}

/** The transform with scale `s` that shows content point `q` at screen point `f`. */
export function anchored(q: Point, f: Point, s: number, c: Point): ViewTransform {
  'worklet';
  return { s, tx: f.x - c.x - s * (q.x - c.x), ty: f.y - c.y - s * (q.y - c.y) };
}

/** Zoom by `factor` about screen point `f`, keeping whatever is under `f` in place. */
export function zoomAbout(t: ViewTransform, f: Point, factor: number, c: Point): ViewTransform {
  'worklet';
  return anchored(contentAt(t, f, c), f, t.s * factor, c);
}

/** `t` applied after `u`: screenAt(compose(t, u), p) = screenAt(t, screenAt(u, p)). */
export function compose(t: ViewTransform, u: ViewTransform): ViewTransform {
  'worklet';
  return { s: t.s * u.s, tx: t.tx + t.s * u.tx, ty: t.ty + t.s * u.ty };
}

/** The transform that undoes `t`. */
export function inverse(t: ViewTransform): ViewTransform {
  'worklet';
  return { s: 1 / t.s, tx: -t.tx / t.s, ty: -t.ty / t.s };
}

export function isIdentity(t: ViewTransform): boolean {
  'worklet';
  return Math.abs(t.s - 1) < 1e-4 && Math.abs(t.tx) < 0.5 && Math.abs(t.ty) < 0.5;
}
