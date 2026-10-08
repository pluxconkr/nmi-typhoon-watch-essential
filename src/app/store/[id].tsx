/**
 * A supply store: what it sells, where, hours and phone, how it was verified, and offline directions.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { supplyRepo } from '@/data/repos';
import { ISLAND_NAME } from '@/domain/geo';
import { SUPPLY_LABEL } from '@/domain/supplies';
import { storePlace } from '@/services/destinations';
import { useLiveLocation } from '@/services/location';
import { DirectionsSection } from '@/ui/directions-widgets';
import { Callout, Cell, Group, KeyValue, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

async function dial(phone: string) {
  try {
    await Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  } catch {
    /* no dialler — the number is visible as text */
  }
}

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<'/store/[id]'>();
  const store = supplyRepo.get().find((s) => s.id === id) ?? null;
  useLiveLocation('browse');
  const place = useMemo(() => (store ? storePlace(store) : null), [store]);

  if (!store) {
    return (
      <Screen title="Store" fallback="/shelter">
        <Callout icon="cart" title="Not in the saved list">
          <Subhead>This store is not in the copy stored on this phone.</Subhead>
        </Callout>
      </Screen>
    );
  }

  const label = SUPPLY_LABEL[store.category];
  return (
    <Screen
      title={label}
      fallback="/shelter"
      largeTitle={store.name}
      subtitle={`${label} · ${store.village}, ${ISLAND_NAME[store.island]}`}
      note={store.status === 'unknown' ? 'Not confirmed open in 2025–26 — call ahead if you can' : undefined}>
      {place ? <DirectionsSection place={place} link={`store:${store.id}`} /> : null}
      {store.coordConfidence === 'low' ? <SectionFooter>{`The exact spot of this store is not published, so directions go to the centre of ${store.village}. Ask locally or call ahead.`}</SectionFooter> : null}

      <SectionHeader>Details</SectionHeader>
      <Group>
        <View style={styles.kvWrap}>
          {store.address ? <KeyValue k="Address" v={store.address} /> : null}
          <KeyValue k="Hours" v={store.hours ?? 'Not published'} />
          <KeyValue k="Map pin" v={store.coordConfidence === 'high' ? 'Exact (OpenStreetMap)' : store.coordConfidence === 'medium' ? 'Approximate' : 'Village only — use the address'} last={!store.phone} />
        </View>
        {store.phone ? <Cell icon="phone" title={store.phone} subtitle="Store phone" value="Call" valueColor={colors.tint} onPress={() => void dial(store.phone!)} accessibilityRole="link" accessibilityLabel={`Call ${store.name} ${store.phone}`} last /> : null}
      </Group>
      {store.notes ? <SectionFooter>{store.notes}</SectionFooter> : null}

      <SectionHeader>How this was checked</SectionHeader>
      <Group padded>
        <Text style={type.body}>{store.status === 'operating' ? 'Operating, per a 2025–26 source' : 'Not confirmed open in 2025–26'}</Text>
        <Text style={[type.footnote, { marginTop: 4 }]}>{store.statusEvidence}</Text>
        {store.sources.map((src) => (
          <Text key={src.url} style={[type.footnote, styles.source]} selectable>
            {`${src.date} · ${src.what}\n${src.url}`}
          </Text>
        ))}
      </Group>
      <SectionFooter>Last verified {store.lastVerified}. Stores close or run out before a storm — when you have signal, call ahead.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kvWrap: { paddingLeft: 16 },
  source: { marginTop: 8, color: colors.ink2 },
});
