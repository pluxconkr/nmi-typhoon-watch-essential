/**
 * Pinch-zoom and pan maths for both maps. The key property: when a gesture ends and the map re-draws at
 * the new view, every place stays exactly where the fingers left it (no jump).
 */
import { ISLAND_BBOX, type LatLng, makeProjection } from '@/domain/geo';
import { zoomAfter } from '@/ui/IslandMap';
import { MAX_MPP, MIN_MPP, type NavView, viewAfter } from '@/ui/NavMap';
import { IDENTITY, anchored, contentAt, isIdentity, zoomAbout, type Point, type ViewTransform } from '@/ui/zoomMath';

const W = 390;
const H = 760;
const C = { x: W / 2, y: H / 2 };
const M_PER_DEG = 111_320;
const KX = Math.cos((15.2 * Math.PI) / 180);

/** Where a transform puts a content point on screen (React Native scales a view about its centre). */
function onScreen(t: ViewTransform, p: Point, c: Point = C): Point {
  return { x: c.x + t.tx + t.s * (p.x - c.x), y: c.y + t.ty + t.s * (p.y - c.y) };
}

/** The navigation map's north-up projection into the window. */
function navXY(v: NavView, p: LatLng): Point {
  return { x: W / 2 + ((p.lng - v.center.lng) * KX * M_PER_DEG) / v.mpp, y: H * v.anchorY - ((p.lat - v.center.lat) * M_PER_DEG) / v.mpp };
}

function expectNear(a: Point, b: Point, tol = 0.01) {
  expect(Math.abs(a.x - b.x)).toBeLessThan(tol);
  expect(Math.abs(a.y - b.y)).toBeLessThan(tol);
}

describe('zoomMath', () => {
  const t: ViewTransform = { s: 2.5, tx: -40, ty: 75 };

  test('contentAt inverts the view transform', () => {
    const p = { x: 120, y: 610 };
    expectNear(contentAt(t, onScreen(t, p), C), p);
  });

  test('anchored shows the chosen content point under the fingers', () => {
    const q = { x: 300, y: 90 };
    const f = { x: 50, y: 700 };
    expectNear(onScreen(anchored(q, f, 3.2, C), q), f);
  });

  test('zoomAbout keeps whatever is under the fingers in place and multiplies the scale', () => {
    const f = { x: 80, y: 200 };
    const z = zoomAbout(t, f, 1.7, C);
    expect(z.s).toBeCloseTo(t.s * 1.7);
    expectNear(contentAt(z, f, C), contentAt(t, f, C));
  });

  test('isIdentity ignores sub-pixel noise only', () => {
    expect(isIdentity(IDENTITY)).toBe(true);
    expect(isIdentity({ s: 1, tx: 0.2, ty: -0.3 })).toBe(true);
    expect(isIdentity({ s: 1, tx: 4, ty: 0 })).toBe(false);
    expect(isIdentity({ s: 1.01, tx: 0, ty: 0 })).toBe(false);
  });
});

describe('navigation map: view after a gesture', () => {
  const view: NavView = { center: { lat: 15.2071, lng: 145.7189 }, mpp: 2, anchorY: 0.62 };
  const places: LatLng[] = [
    { lat: 15.2071, lng: 145.7189 },
    { lat: 15.2102, lng: 145.7163 },
    { lat: 15.2033, lng: 145.7231 },
  ];

  test.each<[string, ViewTransform]>([
    ['pinch in about a corner', zoomAbout(IDENTITY, { x: 60, y: 140 }, 2.4, C)],
    ['pinch out about the bottom', zoomAbout(IDENTITY, { x: 300, y: 700 }, 0.5, C)],
    ['drag', { s: 1, tx: -120, ty: 85 }],
    ['pinch while dragging', { s: 1.6, tx: 140, ty: -60 }],
  ])('%s: places stay where the fingers left them', (_name, t) => {
    const next = viewAfter(view, t, W, H, KX);
    for (const p of places) expectNear(navXY(next, p), onScreen(t, navXY(view, p)), 1e-6);
  });

  test('scale changes metres per point; a drag keeps it', () => {
    expect(viewAfter(view, { s: 2, tx: 0, ty: 0 }, W, H, KX).mpp).toBeCloseTo(1);
    expect(viewAfter(view, { s: 1, tx: 50, ty: -20 }, W, H, KX).mpp).toBe(2);
  });

  test('dragging the map east moves the view west', () => {
    const next = viewAfter(view, { s: 1, tx: 100, ty: 0 }, W, H, KX);
    expect(next.center.lng).toBeLessThan(view.center.lng);
    expect((view.center.lng - next.center.lng) * KX * M_PER_DEG).toBeCloseTo(100 * view.mpp);
    expect(next.center.lat).toBeCloseTo(view.center.lat, 9);
  });

  test('zoom stays between street level and the whole island', () => {
    expect(viewAfter(view, { s: 1000, tx: 0, ty: 0 }, W, H, KX).mpp).toBe(MIN_MPP);
    expect(viewAfter(view, { s: 0.001, tx: 0, ty: 0 }, W, H, KX).mpp).toBe(MAX_MPP);
  });
});

describe('island map: zoom after a gesture', () => {
  const bbox = ISLAND_BBOX.saipan;
  const w = 358;
  const h = 286;
  const c = { x: w / 2, y: h / 2 };
  const places: LatLng[] = [
    { lat: 15.2071, lng: 145.7189 }, // Garapan
    { lat: 15.1567, lng: 145.7154 }, // Susupe
    { lat: 15.1677, lng: 145.7652 }, // Kagman
  ];

  test.each<[string, ViewTransform]>([
    ['pinch in on Garapan', zoomAbout(IDENTITY, { x: 150, y: 90 }, 3, c)],
    ['pinch in on the middle', zoomAbout(IDENTITY, c, 2, c)],
  ])('%s from the whole island: places stay where the fingers left them', (_name, t) => {
    const win = makeProjection(bbox, w, h, 14, null);
    const zoom = zoomAfter(win, null, t, bbox);
    expect(zoom).not.toBeNull();
    const next = makeProjection(bbox, w, h, 14, zoom);
    for (const p of places) expectNear(next.toXY(p), onScreen(t, win.toXY(p), c), 1e-6);
  });

  test('a drag while zoomed in keeps places under the finger', () => {
    const zoom = { zoom: 4, center: { lat: 15.2, lng: 145.73 } };
    const win = makeProjection(bbox, w, h, 14, zoom);
    const t = { s: 1, tx: 60, ty: -35 };
    const next = makeProjection(bbox, w, h, 14, zoomAfter(win, zoom, t, bbox));
    for (const p of places) expectNear(next.toXY(p), onScreen(t, win.toXY(p), c), 1e-6);
  });

  test('zooming back out shows the whole island again', () => {
    const zoom = { zoom: 2, center: { lat: 15.2, lng: 145.73 } };
    const win = makeProjection(bbox, w, h, 14, zoom);
    expect(zoomAfter(win, zoom, { s: 0.5, tx: 0, ty: 0 }, bbox)).toBeNull();
  });

  test('the centre stays on the island however far you drag', () => {
    const zoom = { zoom: 6, center: { lat: 15.28, lng: 145.82 } };
    const win = makeProjection(bbox, w, h, 14, zoom);
    const next = zoomAfter(win, zoom, { s: 1, tx: -5000, ty: 5000 }, bbox)!;
    expect(next.center.lat).toBeLessThanOrEqual(bbox.maxLat);
    expect(next.center.lng).toBeLessThanOrEqual(bbox.maxLng);
    expect(next.center.lat).toBeGreaterThanOrEqual(bbox.minLat);
    expect(next.center.lng).toBeGreaterThanOrEqual(bbox.minLng);
  });
});
