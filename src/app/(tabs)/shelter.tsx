/**
 * S-06 Shelter · offline shelter map + list (tab 3). Zero network requests on this screen.
 * GPS works without a signal; distances are straight-line. Never an empty screen.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { formatDistance, haversineKm } from '@/domain/geo';
import { isStale, relativeAgo } from '@/domain/time';
import type { Shelter } from '@/domain/types';
import { acquireLocation } from '@/services/location';
import { isOfflineNow, useAppState } from '@/store/appStore';
import { IslandMap } from '@/ui/IslandMap';
import { Card, LinkRow, Pill, SectionLabel, Small, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

type Filter = 'all' | 'medical';

export default function ShelterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const shelters = useAppState((s) => s.shelters);
  const source = useAppState((s) => s.shelterSource);
  const meta = useAppState((s) => s.cacheMeta.shelters);
  const location = useAppState((s) => s.location);
  const locStatus = useAppState((s) => s.locationStatus);
  const offline = useAppState((s) => isOfflineNow(s));
  const household = useAppState((s) => s.household);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (locStatus === 'idle') void acquireLocation();
  }, [locStatus]);

  const list = useMemo(() => {
    const withDist = shelters.map((s) => ({ s, km: location ? haversineKm(location, s) : null }));
    const filtered = filter === 'medical' ? withDist.filter((x) => x.s.wheelchair === true) : withDist;
    return filtered.sort((a, b) => {
      if (a.km !== null && b.km !== null) return a.km - b.km;
      if (a.km !== null) return -1;
      if (b.km !== null) return 1;
      return a.s.island === 'saipan' ? -1 : 1;
    });
  }, [shelters, location, filter]);

  const grouped = useMemo(() => {
    if (location) return null;
    const m = new Map<string, { s: Shelter; km: null }[]>();
    for (const x of list) {
      const key = `${x.s.island === 'saipan' ? 'Saipan' : x.s.island === 'tinian' ? 'Tinian' : 'Rota'} · ${x.s.village}`;
      m.set(key, [...(m.get(key) ?? []), { s: x.s, km: null }]);
    }
    return m;
  }, [list, location]);

  const stamp = source === 'network' && meta?.fetchedAt ? `Shelters saved · ${relativeAgo(meta.fetchedAt)}` : 'Bundled with the app';
  const stale = source === 'network' && meta?.fetchedAt ? isStale(meta.fetchedAt) : false;
  const mapWidth = Math.min(width - 32, 600);
  const noPets = household.pets > 0;

  return (
    <Screen testID="shelter">
      {offline && source === 'bundle' ? (
        <Card tone="red">
          <SectionLabel color={colors.red}>No signal — showing the list that came with the app</SectionLabel>
          <Small>This is the built-in copy, not a live download. It may be older than the latest HSEM announcement, but it is never blank.</Small>
        </Card>
      ) : null}
      {stale ? (
        <Card tone="amber">
          <SectionLabel color={colors.amber}>Shelter list is older than 7 days</SectionLabel>
          <Small>Refresh it while you have signal. The old list stays usable until then.</Small>
        </Card>
      ) : null}

      <IslandMap shelters={shelters} location={location} selectedId={selected} onSelect={(s) => setSelected(s.shelterId)} width={mapWidth} height={Math.round(mapWidth * 0.78)} stamp={stamp} />
      <Xs style={{ marginTop: 8, marginBottom: 12 }}>
        {locStatus === 'granted' && location
          ? 'GPS works without a signal. Distances are straight-line from your position.'
          : locStatus === 'denied'
            ? 'Location permission is off, so shelters are grouped by village instead of sorted by distance.'
            : locStatus === 'requesting'
              ? 'Getting your position from GPS…'
              : 'No GPS fix yet — shelters are grouped by village.'}
      </Xs>

      <View style={styles.chips}>
        <Chip on={filter === 'all'} label="All shelters" onPress={() => setFilter('all')} />
        <Chip on={filter === 'medical'} label="Elderly / medical needs" onPress={() => setFilter('medical')} />
      </View>
      {noPets ? (
        <Card tone="amber">
          <Small>
            <Small style={{ fontWeight: '800', color: colors.ink }}>Pets:</Small> CNMI public shelters accept only certified service animals. Plan to leave pets with family or friends in a sturdy building, with the pet food and water from your checklist.
          </Small>
        </Card>
      ) : null}

      <Card>
        <SectionLabel>{location ? `Nearest shelters (${list.length})` : `Shelters by village (${list.length})`}</SectionLabel>
        {grouped
          ? Array.from(grouped.entries()).map(([village, rows]) => (
              <View key={village}>
                <Text style={styles.groupTitle}>{village}</Text>
                {rows.map((r) => (
                  <ShelterRow key={r.s.shelterId} s={r.s} km={null} onPress={() => router.push({ pathname: '/shelter/[id]', params: { id: r.s.shelterId } })} />
                ))}
              </View>
            ))
          : list.map((r) => <ShelterRow key={r.s.shelterId} s={r.s} km={r.km} onPress={() => router.push({ pathname: '/shelter/[id]', params: { id: r.s.shelterId } })} />)}
      </Card>

      <LinkRow title="Manage offline data" subtitle={source === 'network' && meta?.fetchedAt ? `Shelters saved · ${relativeAgo(meta.fetchedAt)}` : 'Bundled copy · check for a newer list when online'} onPress={() => router.push('/downloads')} right={<Pill tone="green">Ready</Pill>} />
      <Xs style={{ marginBottom: 18 }}>
        Capacity shown is <Xs style={{ fontWeight: '800', color: colors.ink }}>design capacity</Xs>, not live availability. For transport or confirmation call the HSEM State Warning Point at (670) 237-8000 or (670) 664-8000.
      </Xs>
    </Screen>
  );
}

function Chip({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? '✓ ' : ''}{label}</Text>
    </Pressable>
  );
}

function ShelterRow({ s, km, onPress }: { s: Shelter; km: number | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${s.name}, ${s.village}${km !== null ? `, ${formatDistance(km)} away` : ''}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{s.name.charAt(0)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{s.name}</Text>
        <Xs>
          {s.village}
          {s.designCapacity ? ` · space ${s.designCapacity}` : ''}
          {s.wheelchair ? ' · accessible' : ''}
        </Xs>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {km !== null ? <Text style={styles.km}>{formatDistance(km)}</Text> : null}
        <Text style={styles.chev}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: colors.line2, minHeight: 40, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.greenSoft },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink2 },
  chipTextOn: { color: colors.green },
  groupTitle: { fontSize: 12, fontWeight: '800', color: colors.ink3, marginTop: 10, marginBottom: 2, letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line2, minHeight: 56 },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  km: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: colors.navy },
  chev: { fontSize: 18, color: colors.ink3, textAlign: 'right' },
});
