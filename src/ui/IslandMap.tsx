/**
 * Offline vector map of one CNMI island: OSM coastline (bundled, simplified) + shelter pins + GPS dot.
 * No tiles, no network, no API keys. Attribution is always visible (ODbL requirement).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import rota from '@/assets/data/rota-coastline.json';
import saipan from '@/assets/data/saipan-coastline.json';
import saipanVillages from '@/assets/data/saipan-villages.json';
import tinian from '@/assets/data/tinian-coastline.json';
import otherVillages from '@/assets/data/tinian-rota-villages.json';
import { ISLAND_BBOX, ISLAND_NAME, type IslandId, makeProjection, ringToPath } from '@/domain/geo';
import type { LocationFix, Shelter } from '@/domain/types';

import { colors, fonts, palette } from './theme';

const NAVY_LINE = palette.navyTint;
const GREEN_PIN = palette.green;

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
  const proj = useMemo(() => makeProjection(ISLAND_BBOX[island], width, height, 14), [island, width, height]);
  const coast = useMemo(() => ringToPath(data.ring, proj), [data.ring, proj]);
  const pins = useMemo(() => shelters.filter((s) => s.island === island).map((s) => ({ s, ...proj.toXY({ lat: s.lat, lng: s.lng }) })), [shelters, island, proj]);
  // Village labels: skip any that would sit on top of a pin, and nudge the rest to the right of their point.
  const labels = useMemo(() => {
    const out: { name: string; x: number; y: number; anchor: 'start' | 'end' }[] = [];
    for (const name of data.labels) {
      const v = data.villages.find((x) => x.name === name);
      if (!v) continue;
      const p = proj.toXY({ lat: v.lat, lng: v.lng });
      const near = pins.some((pin) => Math.hypot(pin.x - p.x, pin.y - p.y) < 22);
      if (near) continue;
      const anchor: 'start' | 'end' = p.x > width * 0.6 ? 'end' : 'start';
      out.push({ name, x: p.x + (anchor === 'start' ? 5 : -5), y: p.y + 3.5, anchor });
    }
    return out;
  }, [data, pins, proj, width]);
  const you = location ? proj.toXY({ lat: location.lat, lng: location.lng }) : null;
  const youInside = you && you.x >= 0 && you.x <= width && you.y >= 0 && you.y <= height;

  return (
    <View style={[styles.wrap, { width, height }]} accessibilityLabel={`Map of ${ISLAND_NAME[island]} with ${pins.length} shelters${youInside ? ' and your position' : ''}`} accessibilityRole="image">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E3EDF8" />
            <Stop offset="1" stopColor="#D2E1F2" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sea)" />
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
                <Circle cx={x} cy={y} r={on ? 12 : 10} fill={on ? colors.green : GREEN_PIN} stroke={colors.white} strokeWidth={2} />
                <Path d={HOUSE} transform={`translate(${x} ${y}) scale(0.8)`} fill={colors.white} />
              </G>
            );
          })}
        </G>
        {youInside ? (
          <G>
            <Circle cx={you.x} cy={you.y} r={16} fill="rgba(29,82,150,0.18)" />
            <Circle cx={you.x} cy={you.y} r={7} fill={colors.tint} stroke={colors.white} strokeWidth={3} />
          </G>
        ) : null}
        {/* North arrow */}
        <G transform={`translate(${width - 22} 26)`}>
          <Path d="M0 -10 L5 6 L0 3 L-5 6 Z" fill={colors.ink2} />
          <SvgText x={0} y={18} fontSize={9} fontWeight="800" fill={colors.ink2} textAnchor="middle">N</SvgText>
        </G>
      </Svg>
      <View style={styles.islandTag} pointerEvents="none">
        <Text style={styles.islandTagText}>{ISLAND_NAME[island]}</Text>
      </View>
      {you && !youInside ? (
        <View style={styles.offIsland}>
          <Text style={styles.offIslandText}>Your position is off this map</Text>
        </View>
      ) : null}
      <View style={styles.attrib} pointerEvents="none">
        <Text style={styles.attribText}>© OpenStreetMap contributors</Text>
      </View>
    </View>
  );
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
  islandTagText: { fontSize: 13, fontWeight: '600', color: colors.ink2, letterSpacing: -0.08 },
  offIsland: { position: 'absolute', top: 30, left: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  offIslandText: { fontSize: 11, fontWeight: '700', color: colors.ink2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  legendText: { fontSize: 12.5, color: colors.ink2, fontWeight: '600' },
});
