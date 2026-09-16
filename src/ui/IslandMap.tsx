/**
 * Offline vector map of Saipan: OSM coastline (bundled, 400 vertices) + shelter pins + GPS dot.
 * No tiles, no network, no API keys. Attribution is always visible (ODbL requirement).
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import saipan from '@/assets/data/saipan-coastline.json';
import villages from '@/assets/data/saipan-villages.json';
import { SAIPAN_BBOX, makeProjection, ringToPath } from '@/domain/geo';
import type { LocationFix, Shelter } from '@/domain/types';

import { colors, fonts } from './theme';

const LABEL_VILLAGES = new Set(['Garapan', 'Susupe', 'Chalan Kanoa', 'Koblerville', 'Kagman', 'Tanapag', 'San Roque', 'Capitol Hill', 'San Vicente', 'Dandan', 'Marpi']);

export function IslandMap({
  shelters,
  location,
  selectedId,
  onSelect,
  width,
  height = 240,
  stamp,
}: {
  shelters: Shelter[];
  location: LocationFix | null;
  selectedId?: string | null;
  onSelect?: (s: Shelter) => void;
  width: number;
  height?: number;
  /** "Bundled with the app" / "Cached · 2 days ago" */
  stamp: string;
}) {
  const proj = useMemo(() => makeProjection(SAIPAN_BBOX, width, height, 10), [width, height]);
  const coast = useMemo(() => ringToPath(saipan.ring as [number, number][], proj), [proj]);
  const labels = useMemo(
    () => villages.villages.filter((v) => LABEL_VILLAGES.has(v.name)).map((v) => ({ name: v.name, ...proj.toXY({ lat: v.lat, lng: v.lng }) })),
    [proj],
  );
  const pins = shelters.filter((s) => s.island === 'saipan').map((s) => ({ s, ...proj.toXY({ lat: s.lat, lng: s.lng }) }));
  const you = location ? proj.toXY({ lat: location.lat, lng: location.lng }) : null;
  const youInside = you && you.x >= 0 && you.x <= width && you.y >= 0 && you.y <= height;

  return (
    <View style={[styles.wrap, { width, height }]} accessibilityLabel={`Map of Saipan with ${pins.length} shelters${you ? ' and your position' : ''}`} accessibilityRole="image">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={coast} fill="#DCE9F3" stroke={colors.navy3} strokeWidth={1.2} strokeLinejoin="round" />
        <G>
          {labels.map((l) => (
            <SvgText key={l.name} x={l.x + 6} y={l.y + 3} fontSize={9} fontWeight="700" fill={colors.ink2} fontFamily={fonts.sans}>
              {l.name}
            </SvgText>
          ))}
        </G>
        <G>
          {pins.map(({ s, x, y }) => {
            const on = s.shelterId === selectedId;
            return (
              <G key={s.shelterId} onPress={onSelect ? () => onSelect(s) : undefined}>
                <Circle cx={x} cy={y} r={on ? 9 : 7} fill={colors.green} stroke={colors.white} strokeWidth={2} />
                <SvgText x={x} y={y + 3.5} fontSize={9} fontWeight="900" fill={colors.white} textAnchor="middle">
                  S
                </SvgText>
              </G>
            );
          })}
        </G>
        {youInside ? (
          <G>
            <Circle cx={you.x} cy={you.y} r={13} fill="rgba(11,37,69,0.15)" />
            <Circle cx={you.x} cy={you.y} r={7} fill={colors.navy} stroke={colors.white} strokeWidth={3} />
          </G>
        ) : null}
      </Svg>
      {you && !youInside ? (
        <View style={styles.offIsland}>
          <Text style={styles.offIslandText}>Your position is off this map</Text>
        </View>
      ) : null}
      <View style={styles.stamp} pointerEvents="none">
        <Text style={styles.stampText}>{stamp}</Text>
      </View>
      <Pressable style={styles.attrib} accessibilityRole="link" accessibilityLabel="Map data copyright OpenStreetMap contributors">
        <Text style={styles.attribText}>© OpenStreetMap contributors</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#E4EBF3', borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  stamp: { position: 'absolute', right: 7, bottom: 7, backgroundColor: 'rgba(11,37,69,0.86)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  stampText: { color: '#DCE9F8', fontSize: 10, fontWeight: '700' },
  attrib: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  attribText: { fontSize: 9, color: colors.ink2 },
  offIsland: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  offIslandText: { fontSize: 10, fontWeight: '700', color: colors.ink2 },
});
