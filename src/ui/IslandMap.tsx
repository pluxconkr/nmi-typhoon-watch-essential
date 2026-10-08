/**
 * Offline vector map of one CNMI island: OSM coastline (bundled, simplified) + shelter pins + GPS dot.
 * No tiles, no network, no API keys. Attribution is always visible (ODbL requirement).
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import rota from '@/assets/data/rota-coastline.json';
import saipan from '@/assets/data/saipan-coastline.json';
import saipanVillages from '@/assets/data/saipan-villages.json';
import tinian from '@/assets/data/tinian-coastline.json';
import otherVillages from '@/assets/data/tinian-rota-villages.json';
import { type BBox, ISLAND_BBOX, ISLAND_NAME, type IslandId, type MapZoom, type Projection, makeProjection, ringToPath } from '@/domain/geo';
import type { LocationFix, Shelter } from '@/domain/types';

import { colors, fonts, palette } from './theme';
import { ZoomPan } from './ZoomPan';
import { clamp, contentAt, type ViewTransform } from './zoomMath';

const NAVY_LINE = palette.navyTint;
const GREEN_PIN = palette.green;
/** Shelters used only in earlier storms: present, but not on the latest official list. */
const PAST_PIN = '#8E96A3';

type Ring = [number, number][];
interface VillagePoint {
  name: string;
  lat: number;
  lng: number;
}

/** Per-island bundle: coastline ring, labelled villages (in priority order). */
const ISLANDS: Record<IslandId, { ring: Ring; villages: VillagePoint[]; labels: string[] }> = {
  saipan: {
    ring: saipan.ring as Ring,
    villages: saipanVillages.villages,
    labels: ['Garapan', 'Susupe', 'Chalan Kanoa', 'Koblerville', 'Kagman', 'Tanapag', 'San Roque', 'Capitol Hill', 'San Vicente', 'Dandan', 'Marpi', 'Oleai'],
  },
  tinian: { ring: tinian.ring as Ring, villages: otherVillages.villages.filter((v) => v.island === 'tinian'), labels: ['San Jose', 'Marpo Heights'] },
  rota: { ring: rota.ring as Ring, villages: otherVillages.villages.filter((v) => v.island === 'rota'), labels: ['Songsong', 'Sinapalo'] },
};

/** House glyph, 12×12, centred on 0,0. */
const HOUSE = 'M-6 0 L0 -6 L6 0 L6 5 L2 5 L2 1 L-2 1 L-2 5 L-6 5 Z';

/** Furthest you can zoom into an island map (× the whole-island view). */
const MAX_ZOOM = 14;
/** Approximate width of one character of a 10 pt bold village label, and the largest pin radius. */
const LABEL_CHAR_W = 6.2;
const PIN_R = 12;

export function IslandMap({
  island = 'saipan',
  shelters,
  location,
  selectedId,
  onSelect,
  width,
  height = 240,
}: {
  island?: IslandId;
  shelters: Shelter[];
  location: LocationFix | null;
  selectedId?: string | null;
  onSelect?: (s: Shelter) => void;
  width: number;
  height?: number;
}) {
  const data = ISLANDS[island];
  const bbox = ISLAND_BBOX[island];
  // null = the whole island; otherwise zoomed in with `center` in the middle of the map.
  const [zoom, setZoom] = useState<MapZoom | null>(null);
  const margin = zoom ? Math.round(Math.min(width, height) / 2) : 0;
  const k = zoom?.zoom ?? 1;

  // Window projection (what is on screen) and the same shifted by the margin (what is drawn).
  const win = useMemo(() => makeProjection(bbox, width, height, 14, zoom), [bbox, width, height, zoom]);
  const proj: Projection = useMemo(
    () => ({ width: width + 2 * margin, height: height + 2 * margin, toXY: (p) => shift(win.toXY(p), margin), toLatLng: (x, y) => win.toLatLng(x - margin, y - margin) }),
    [win, margin, width, height],
  );
  const coast = useMemo(() => ringToPath(data.ring, proj), [data.ring, proj]);
  const pins = useMemo(() => shelters.filter((s) => s.island === island).map((s) => ({ s, ...proj.toXY({ lat: s.lat, lng: s.lng }) })), [shelters, island, proj]);
  // Village labels beside their point (left of it near the right edge); skip any a pin would cover.
  const labels = useMemo(() => {
    const out: { name: string; x: number; y: number; anchor: 'start' | 'end' }[] = [];
    for (const name of data.labels) {
      const v = data.villages.find((x) => x.name === name);
      if (!v) continue;
      const p = proj.toXY({ lat: v.lat, lng: v.lng });
      const anchor: 'start' | 'end' = p.x - margin > width * 0.6 ? 'end' : 'start';
      const x = p.x + (anchor === 'start' ? 5 : -5);
      const left = anchor === 'start' ? x : x - name.length * LABEL_CHAR_W;
      const right = left + name.length * LABEL_CHAR_W;
      if (pins.some((pin) => pin.x > left - PIN_R && pin.x < right + PIN_R && pin.y > p.y - 4 - PIN_R && pin.y < p.y + 6 + PIN_R)) continue;
      out.push({ name, x, y: p.y + 3.5, anchor });
    }
    return out;
  }, [data, pins, proj, width, margin]);
  const you = location ? proj.toXY({ lat: location.lat, lng: location.lng }) : null;
  const youOnMap = you && you.x >= margin && you.x <= margin + width && you.y >= margin && you.y <= margin + height;

  // Applied to the latest zoom: a second gesture can end before the first one is drawn.
  const commit = (t: ViewTransform) => setZoom((z) => zoomAfter(makeProjection(bbox, width, height, 14, z), z, t, bbox));

  return (
    <View style={[styles.wrap, { width, height }]} accessibilityLabel={`Map of ${ISLAND_NAME[island]} with ${pins.length} shelters${youOnMap ? ' and your position' : ''}. Pinch to zoom${zoom ? ', drag to move' : ''}.`} accessibilityRole="image">
      <ZoomPan width={width} height={height} margin={margin} minScale={1 / k} maxScale={MAX_ZOOM / k} panEnabled={!!zoom} onCommit={commit} testID="island-map">
        <Svg width={width + 2 * margin} height={height + 2 * margin}>
          <Defs>
            <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#E3EDF8" />
              <Stop offset="1" stopColor="#D2E1F2" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width + 2 * margin} height={height + 2 * margin} fill="url(#sea)" />
          <Path d={coast} fill="#FBFCFE" stroke={NAVY_LINE} strokeWidth={1.4} strokeLinejoin="round" />
          <G>
            {labels.map((l) => (
              <G key={l.name}>
                <SvgText x={l.x} y={l.y} fontSize={10} fontWeight="700" fill="#FBFCFE" stroke="#FBFCFE" strokeWidth={3} fontFamily={fonts.sans} textAnchor={l.anchor}>
                  {l.name}
                </SvgText>
                <SvgText x={l.x} y={l.y} fontSize={10} fontWeight="700" fill={colors.ink2} fontFamily={fonts.sans} textAnchor={l.anchor}>
                  {l.name}
                </SvgText>
              </G>
            ))}
          </G>
          <G>
            {pins.map(({ s, x, y }) => {
              const on = s.shelterId === selectedId;
              return (
                <G key={s.shelterId} onPress={onSelect ? () => onSelect(s) : undefined}>
                  <Circle cx={x} cy={y} r={on ? 12 : s.designation === 'past' ? 8 : 10} fill={s.designation === 'past' ? PAST_PIN : on ? colors.green : GREEN_PIN} stroke={colors.white} strokeWidth={2} />
                  <Path d={HOUSE} transform={`translate(${x} ${y}) scale(${s.designation === 'past' ? 0.65 : 0.8})`} fill={colors.white} />
                </G>
              );
            })}
          </G>
          {you && youOnMap ? (
            <G>
              <Circle cx={you.x} cy={you.y} r={16} fill="rgba(29,82,150,0.18)" />
              <Circle cx={you.x} cy={you.y} r={7} fill={colors.tint} stroke={colors.white} strokeWidth={3} />
            </G>
          ) : null}
        </Svg>
      </ZoomPan>
      {/* North arrow (fixed: the map is always north-up), with a light halo for when land is under it */}
      <View style={styles.north} pointerEvents="none">
        <Svg width={20} height={30}>
          <Path d="M10 2 L15 18 L10 15 L5 18 Z" fill={colors.ink2} stroke="#FBFCFE" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M10 2 L15 18 L10 15 L5 18 Z" fill={colors.ink2} />
          <SvgText x={10} y={27} fontSize={9} fontWeight="800" fill="#FBFCFE" stroke="#FBFCFE" strokeWidth={3} textAnchor="middle">
            N
          </SvgText>
          <SvgText x={10} y={27} fontSize={9} fontWeight="800" fill={colors.ink2} textAnchor="middle">
            N
          </SvgText>
        </Svg>
      </View>
      {/* Zoomed in, the "All of …" button names the island instead (and pins can be under the corner). */}
      {!zoom ? (
        <View style={styles.islandTag} pointerEvents="none">
          <Text style={styles.islandTagText}>{ISLAND_NAME[island]}</Text>
        </View>
      ) : null}
      {location && !youOnMap && !zoom ? (
        <View style={styles.offIsland} pointerEvents="none">
          <Text style={styles.offIslandText}>Your position is off this map</Text>
        </View>
      ) : null}
      {zoom ? (
        <Pressable onPress={() => setZoom(null)} accessibilityRole="button" accessibilityLabel={`Show all of ${ISLAND_NAME[island]}`} style={({ pressed }) => [styles.wholeButton, pressed && { opacity: 0.7 }]}>
          <Text style={styles.wholeButtonText}>{`All of ${ISLAND_NAME[island]}`}</Text>
        </Pressable>
      ) : null}
      <View style={styles.attrib} pointerEvents="none">
        <Text style={styles.attribText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
}

/**
 * The zoom a finished gesture leads to: whatever is now in the middle of the window becomes the centre
 * (kept on the island), or null — the whole island — once zoomed back out.
 */
export function zoomAfter(win: Projection, zoom: MapZoom | null, t: ViewTransform, bbox: BBox): MapZoom | null {
  const next = clamp((zoom?.zoom ?? 1) * t.s, 1, MAX_ZOOM);
  if (next <= 1.02) return null;
  const c = { x: win.width / 2, y: win.height / 2 };
  const q = contentAt(t, c, c);
  const center = win.toLatLng(q.x, q.y);
  return { zoom: next, center: { lat: clamp(center.lat, bbox.minLat, bbox.maxLat), lng: clamp(center.lng, bbox.minLng, bbox.maxLng) } };
}

function shift(p: { x: number; y: number }, m: number) {
  return { x: p.x + m, y: p.y + m };
}

/** Legend row rendered under the map. */
export function MapLegend({ hasPosition }: { hasPosition: boolean }) {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: GREEN_PIN }]} />
        <Text style={styles.legendText}>Shelter</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: PAST_PIN }]} />
        <Text style={styles.legendText}>Earlier storms</Text>
      </View>
      <Text style={[styles.legendText, styles.legendHint]}>Pinch to zoom</Text>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.tint, opacity: hasPosition ? 1 : 0.35 }]} />
        <Text style={styles.legendText}>{hasPosition ? 'You (GPS)' : 'You (no GPS fix yet)'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#E3EDF8', borderRadius: 12, overflow: 'hidden' },
  attrib: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  attribText: { fontSize: 9.5, color: colors.ink2 },
  islandTag: { position: 'absolute', top: 8, left: 8 },
  north: { position: 'absolute', top: 8, right: 10 },
  wholeButton: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  wholeButtonText: { fontSize: 13, fontWeight: '600', color: colors.tint },
  legendHint: { fontWeight: '400', color: colors.ink2 },
  islandTagText: { fontSize: 13, fontWeight: '600', color: colors.ink2, letterSpacing: -0.08, textShadowColor: '#FBFCFE', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } },
  offIsland: { position: 'absolute', top: 30, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  offIslandText: { fontSize: 11, fontWeight: '700', color: colors.ink2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  legendText: { fontSize: 12.5, color: colors.ink2, fontWeight: '600' },
});
