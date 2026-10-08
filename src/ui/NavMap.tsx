/**
 * Street-level offline map for navigation: coastline, every road from the bundled OSM graph that falls in
 * view, the route (travelled part greyed), the destination and your position. North up, no tiles, no network.
 * Pinch to zoom, drag to pan, double-tap to zoom in (ZoomPan); the new view is reported through onViewChange.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { LatLng } from '@/domain/geo';
import type { RoadGraph } from '@/domain/roads';
import type { Route } from '@/domain/routing';

import { colors, palette } from './theme';
import { ZoomPan } from './ZoomPan';
import { clamp, contentAt, type ViewTransform } from './zoomMath';

const M_PER_DEG = 111_320;
const GRID_DEG = 0.002;
const HOUSE = 'M-6 0 L0 -6 L6 0 L6 5 L2 5 L2 1 L-2 1 L-2 5 L-6 5 Z';
/** Zoom limits in metres per screen point: about 120 m across at the closest, the whole island at the widest. */
export const MIN_MPP = 0.3;
export const MAX_MPP = 60;
/** Extra map drawn around the window so a drag reveals roads that are already there. */
const MARGIN = 140;

interface Projector {
  x: (lng: number) => number;
  y: (lat: number) => number;
}

/**
 * North-up projection into the drawn canvas: `center` sits at (width / 2, height × anchorY) of the window,
 * which is offset by MARGIN inside the canvas. Rounded to 0.1 pt for compact paths.
 */
function projector(view: NavView, width: number, height: number, kx: number): Projector {
  const cy = height * view.anchorY;
  return {
    x: (lng) => Math.round((MARGIN + width / 2 + ((lng - view.center.lng) * kx * M_PER_DEG) / view.mpp) * 10) / 10,
    y: (lat) => Math.round((MARGIN + cy - ((lat - view.center.lat) * M_PER_DEG) / view.mpp) * 10) / 10,
  };
}

/** The view a finished gesture leads to: what is now at the anchor point becomes the centre. */
export function viewAfter(view: NavView, t: ViewTransform, width: number, height: number, kx: number): NavView {
  const anchor = { x: width / 2, y: height * view.anchorY };
  const q = contentAt(t, anchor, { x: width / 2, y: height / 2 });
  return {
    center: { lat: view.center.lat - ((q.y - anchor.y) * view.mpp) / M_PER_DEG, lng: view.center.lng + ((q.x - anchor.x) * view.mpp) / (M_PER_DEG * kx) },
    mpp: clamp(view.mpp / t.s, MIN_MPP, MAX_MPP),
    anchorY: view.anchorY,
  };
}

export interface NavView {
  center: LatLng;
  /** Metres per screen point. */
  mpp: number;
  /** Vertical position of the centre as a fraction of the height (0.62 keeps you below the banner). */
  anchorY: number;
}

export function NavMap({
  width,
  height,
  graph,
  coast,
  route,
  along,
  user,
  destination,
  view,
  bottomInset = 0,
  onViewChange,
  onInteract,
}: {
  width: number;
  height: number;
  graph: RoadGraph;
  coast: [number, number][];
  route: Route | null;
  along: number;
  /** Your position: accuracy draws the halo, heading the arrow. */
  user: (LatLng & { accuracyM?: number | null; heading?: number | null }) | null;
  destination: LatLng | null;
  view: NavView;
  /** Space covered by overlays at the bottom (keeps the attribution visible). */
  bottomInset?: number;
  /**
   * A pinch, drag or double-tap finished: apply `update` to the view on screen (the latest one — a second
   * gesture can end before the first is drawn) to get the view the user moved to.
   */
  onViewChange?: (update: (view: NavView) => NavView) => void;
  /** The user started touching the map (stop following GPS). */
  onInteract?: () => void;
}) {
  const p = useMemo(() => projector(view, width, height, graph.kx), [view, width, height, graph.kx]);
  const commit = (t: ViewTransform) => onViewChange?.((v) => viewAfter(v, t, width, height, graph.kx));

  const roads = useMemo(() => {
    const { center, mpp } = view;
    const kx = graph.kx;
    const cy = height * view.anchorY;
    const latMin = center.lat - ((height - cy + MARGIN) * mpp) / M_PER_DEG;
    const latMax = center.lat + ((cy + MARGIN) * mpp) / M_PER_DEG;
    const lngHalf = ((width / 2 + MARGIN) * mpp) / (M_PER_DEG * kx);
    const x0 = Math.floor((center.lng - lngHalf) / GRID_DEG);
    const x1 = Math.floor((center.lng + lngHalf) / GRID_DEG);
    const y0 = Math.floor(latMin / GRID_DEG);
    const y1 = Math.floor(latMax / GRID_DEG);
    const seen = new Set<number>();
    const groups = ['', '', ''];
    const minorCutoff = mpp > 8 ? 2 : 5; // zoomed far out: skip service roads, tracks and paths
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy2 = y0; cy2 <= y1; cy2++) {
        const list = graph.grid.get(cx * 100_000 + cy2);
        if (!list) continue;
        for (const e of list) {
          if (seen.has(e)) continue;
          seen.add(e);
          const cls = graph.edgeFlags[e] & 7;
          if (cls > minorCutoff) continue;
          const group = cls <= 1 ? 0 : cls === 2 ? 1 : 2;
          const s = graph.geomStart[e];
          let d = `M${p.x(graph.ptLng[s])} ${p.y(graph.ptLat[s])}`;
          for (let k = s + 1; k < s + graph.geomCount[e]; k++) d += `L${p.x(graph.ptLng[k])} ${p.y(graph.ptLat[k])}`;
          groups[group] += d;
        }
      }
    }
    return groups;
  }, [graph, view, width, height, p]);

  const coastPath = useMemo(() => coast.reduce((d, [lng, lat], i) => `${d}${i === 0 ? 'M' : 'L'}${p.x(lng)} ${p.y(lat)}`, '') + 'Z', [coast, p]);

  const routePaths = useMemo(() => {
    if (!route) return { done: '', todo: '' };
    let done = '';
    let todo = '';
    for (let i = 0; i < route.lat.length; i++) {
      const pt = `${p.x(route.lng[i])} ${p.y(route.lat[i])}`;
      if (route.cumDist[i] <= along) done += `${done ? 'L' : 'M'}${pt}`;
      if (route.cumDist[i] >= along || (i + 1 < route.lat.length && route.cumDist[i + 1] > along)) todo += `${todo ? 'L' : 'M'}${pt}`;
    }
    return { done, todo };
  }, [route, along, p]);

  const dest = destination ? { x: p.x(destination.lng), y: p.y(destination.lat) } : null;
  const roadEnd = route ? { x: p.x(route.end.lng), y: p.y(route.end.lat) } : null;
  const me = user ? { x: p.x(user.lng), y: p.y(user.lat), r: user.accuracyM ? Math.min(120, user.accuracyM / view.mpp) : 0 } : null;

  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel="Navigation map. Pinch to zoom, drag to move.">
      <ZoomPan width={width} height={height} margin={MARGIN} minScale={view.mpp / MAX_MPP} maxScale={view.mpp / MIN_MPP} onCommit={commit} onStart={onInteract} testID="nav-map">
      <Svg width={width + 2 * MARGIN} height={height + 2 * MARGIN}>
        <Rect x={0} y={0} width={width + 2 * MARGIN} height={height + 2 * MARGIN} fill="#D7E5F4" />
        <Path d={coastPath} fill="#F6F7F4" stroke={palette.navyTint} strokeWidth={1} strokeOpacity={0.35} />
        <Path d={roads[2]} stroke="#D9DCE2" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={roads[1]} stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={roads[1]} stroke="#C9CED6" strokeWidth={5.5} strokeOpacity={0.35} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={roads[0]} stroke="#FFFFFF" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={roads[0]} stroke="#F2D58C" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {routePaths.done ? <Path d={routePaths.done} stroke="#9AA4B2" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {routePaths.todo ? (
          <G>
            <Path d={routePaths.todo} stroke="#FFFFFF" strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={routePaths.todo} stroke={palette.navyTint} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        ) : null}
        {dest && roadEnd && Math.hypot(dest.x - roadEnd.x, dest.y - roadEnd.y) > 4 ? (
          <Path d={`M${roadEnd.x} ${roadEnd.y}L${dest.x} ${dest.y}`} stroke={palette.navyTint} strokeWidth={3} strokeDasharray="4 5" strokeLinecap="round" />
        ) : null}
        {dest ? (
          <G>
            <Circle cx={dest.x} cy={dest.y} r={14} fill={colors.green} stroke={colors.white} strokeWidth={3} />
            <Path d={HOUSE} transform={`translate(${dest.x} ${dest.y}) scale(1.05)`} fill={colors.white} />
          </G>
        ) : null}
        {me ? (
          <G>
            {me.r > 12 ? <Circle cx={me.x} cy={me.y} r={me.r} fill="rgba(29,82,150,0.12)" stroke="rgba(29,82,150,0.25)" strokeWidth={1} /> : null}
            {user?.heading != null ? (
              <Path d="M0 -17 L9 6 L0 2 L-9 6 Z" transform={`translate(${me.x} ${me.y}) rotate(${user.heading})`} fill={colors.tint} stroke={colors.white} strokeWidth={2.5} strokeLinejoin="round" />
            ) : (
              <Circle cx={me.x} cy={me.y} r={9} fill={colors.tint} stroke={colors.white} strokeWidth={3.5} />
            )}
          </G>
        ) : null}
      </Svg>
      </ZoomPan>
      <View style={[styles.attrib, { bottom: bottomInset + 8 }]} pointerEvents="none">
        <Text style={styles.attribText}>{graph.attribution.replace(', ODbL 1.0', '')}</Text>
      </View>
    </View>
  );
}

/** Centre and zoom that fit a set of points (route overview). */
export function fitView(points: { lat: number; lng: number }[], width: number, height: number, kx: number, padTop: number, padBottom: number): NavView {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const usableH = Math.max(100, height - padTop - padBottom);
  const spanY = (maxLat - minLat) * M_PER_DEG;
  const spanX = (maxLng - minLng) * M_PER_DEG * kx;
  const mpp = Math.max(1.5, (spanX / (width - 48)) * 1.15, (spanY / usableH) * 1.15);
  const centerY = padTop + usableH / 2;
  return { center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }, mpp, anchorY: centerY / height };
}

const styles = StyleSheet.create({
  attrib: { position: 'absolute', left: 8, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  attribText: { fontSize: 9.5, color: colors.ink2 },
});
