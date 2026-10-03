/**
 * Geometry helpers: great-circle distance and a simple equirectangular projection
 * used by the offline SVG island map. Pure functions.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "1.2 km" / "850 m" */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Island bounding boxes (from the bundled OSM coastlines), padded slightly for pins near the shore. */
export const SAIPAN_BBOX: BBox = { minLat: 15.085, maxLat: 15.297, minLng: 145.683, maxLng: 145.837 };
export const TINIAN_BBOX: BBox = { minLat: 14.915, maxLat: 15.108, minLng: 145.575, maxLng: 145.681 };
export const ROTA_BBOX: BBox = { minLat: 14.103, maxLat: 14.208, minLng: 145.114, maxLng: 145.298 };

export type IslandId = 'saipan' | 'tinian' | 'rota';
export const ISLAND_BBOX: Record<IslandId, BBox> = { saipan: SAIPAN_BBOX, tinian: TINIAN_BBOX, rota: ROTA_BBOX };
export const ISLAND_NAME: Record<IslandId, string> = { saipan: 'Saipan', tinian: 'Tinian', rota: 'Rota' };

export function inBBox(p: LatLng, b: BBox): boolean {
  return p.lat >= b.minLat && p.lat <= b.maxLat && p.lng >= b.minLng && p.lng <= b.maxLng;
}

/** Which island a position is on (by bounding box), or null when at sea / elsewhere. */
export function islandAt(p: LatLng): IslandId | null {
  for (const id of ['saipan', 'tinian', 'rota'] as const) if (inBBox(p, ISLAND_BBOX[id])) return id;
  return null;
}

export interface Projection {
  width: number;
  height: number;
  /** Project a coordinate to SVG space. */
  toXY: (p: LatLng) => { x: number; y: number };
}

/**
 * Equirectangular projection that fits `bbox` into a width×height box, preserving
 * aspect ratio (longitude scaled by cos(mid-latitude)), centred with padding.
 */
export function makeProjection(bbox: BBox, width: number, height: number, padding = 8): Projection {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const kx = Math.cos(toRad(midLat));
  const spanX = (bbox.maxLng - bbox.minLng) * kx;
  const spanY = bbox.maxLat - bbox.minLat;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const drawnW = spanX * scale;
  const drawnH = spanY * scale;
  const offX = padding + (innerW - drawnW) / 2;
  const offY = padding + (innerH - drawnH) / 2;
  return {
    width,
    height,
    toXY: (p) => ({
      x: offX + (p.lng - bbox.minLng) * kx * scale,
      y: offY + (bbox.maxLat - p.lat) * scale,
    }),
  };
}

/** Build an SVG path "M x y L x y … Z" for a ring of [lng, lat] positions. */
export function ringToPath(ring: readonly (readonly [number, number])[], proj: Projection, precision = 1): string {
  if (ring.length === 0) return '';
  const f = (n: number) => n.toFixed(precision);
  let d = '';
  for (let i = 0; i < ring.length; i++) {
    const { x, y } = proj.toXY({ lng: ring[i][0], lat: ring[i][1] });
    d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
}

/** Compass bearing from a to b in degrees (0 = north). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** "NE" style compass label for a bearing. */
export function compassLabel(bearing: number): string {
  return COMPASS[Math.round(bearing / 45) % 8];
}
