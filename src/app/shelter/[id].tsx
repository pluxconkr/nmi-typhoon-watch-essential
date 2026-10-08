/**
 * S-07 Shelter detail · all offline. No deep link to an external map app (it would fail offline).
 * Landmark directions are pre-written in the shelter data; phone numbers use tel: and the app never
 * decides whether a call will work.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shelterRepo, supplyRepo } from '@/data/repos';
import { CONTACTS } from '@/domain/contacts';
import { bearingDeg, compassLabel, formatDistance, haversineKm } from '@/domain/geo';
import { SUPPLY_LABEL, storesNear } from '@/domain/supplies';
import { shelterPlace } from '@/services/destinations';
import { useLiveLocation } from '@/services/location';
import { useAppState } from '@/store/appStore';
import { useChecklist } from '@/store/derived';
import { checklistIcon, supplyIcon } from '@/ui/icons';
import { DirectionsSection } from '@/ui/directions-widgets';
import { Callout, Cell, Group, KeyValue, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, type } from '@/ui/theme';

const HSEM = CONTACTS.find((c) => c.id === 'hsem-swp')!;

async function dial(e164: string) {
  try {
    await Linking.openURL(`tel:${e164}`);
  } catch {
    /* no dialler (simulator / tablet) — the number is visible as text */
  }
}

const pretty = (e164: string) => e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');

export default function ShelterDetailScreen() {
  const { id } = useLocalSearchParams<'/shelter/[id]'>();
  const shelter = useAppState((s) => s.shelters.find((x) => x.shelterId === id) ?? null);
  const location = useAppState((s) => s.location);
  const { items, household } = useChecklist();
  useLiveLocation('browse');
  const router = useRouter();
  // Stable identity: the directions block re-plans only when the place (or your position) changes.
  const place = useMemo(() => (shelter ? shelterPlace(shelter) : null), [shelter]);

  if (!shelter) {
    return (
      <Screen title="Shelter" fallback="/shelter">
        <Callout icon="shelter" title="Not in the saved list">
          <Subhead>This shelter is not in the copy stored on this phone.</Subhead>
        </Callout>
      </Screen>
    );
  }

  const km = location ? haversineKm(location, shelter) : null;
  const dir = location ? compassLabel(bearingDeg(location, shelter)) : null;
  const bring = items.filter((i) => i.bringToShelter);
  const nearby = storesNear(supplyRepo.get(), shelter, shelter.island);
  const phone = shelter.phone ?? HSEM.e164;
  const islandName = shelter.island.charAt(0).toUpperCase() + shelter.island.slice(1);
  const yesNo = (v: boolean | null, yes: string, no: string) => (v === true ? yes : v === false ? no : 'Not confirmed');

  const latest = shelterRepo.latestAnnouncement();

  return (
    <Screen title="Shelter" fallback="/shelter" largeTitle={shelter.name} subtitle={`${shelter.village}, ${islandName}${km !== null ? ` · ${formatDistance(km)} away, ${dir}` : ''}`}>
      {shelter.caution ? (
        <Callout icon="danger" tone="red" title="Damaged — check before going">
          <Subhead>{shelter.caution}</Subhead>
        </Callout>
      ) : null}
      {shelter.designation === 'past' ? (
        <Callout icon="alert" tone="amber" title="Not on the latest shelter list">
          <Subhead>{`HSEM did not name it for ${latest.storm} (${latest.dates}); it was used in an earlier storm. Call HSEM ${HSEM.display} before going.`}</Subhead>
        </Callout>
      ) : null}
      {place ? <DirectionsSection place={place} link={`shelter:${shelter.shelterId}`} /> : null}

      {nearby.length ? (
        <>
          <SectionHeader>Where to buy supplies nearby</SectionHeader>
          <Group>
            {nearby.map(({ store, km }, i) => (
              <Cell
                key={store.id}
                icon={supplyIcon(store.category)}
                iconColor={colors.tint}
                title={store.name}
                subtitle={[SUPPLY_LABEL[store.category], store.coordConfidence === 'low' ? `in ${store.village}` : `${formatDistance(km)} from the shelter`, store.status === 'unknown' ? 'not confirmed open' : null].filter(Boolean).join(' · ')}
                accessory="chevron"
                onPress={() => router.push({ pathname: '/store/[id]', params: { id: store.id } })}
                last={i === nearby.length - 1}
              />
            ))}
          </Group>
          <SectionFooter>Straight-line distance from the shelter. Stores close or run out before a storm — buy early, and call ahead when you have signal.</SectionFooter>
        </>
      ) : null}

      <SectionHeader>How to find it</SectionHeader>
      <Group padded>
        <Text style={type.body}>{shelter.landmarkHint}</Text>
      </Group>
      <SectionFooter>Written in advance and stored with the shelter list, for when GPS or the map is not enough.</SectionFooter>

      <SectionHeader>Call before you go</SectionHeader>
      <Group>
        <Cell icon="phone" title={pretty(phone)} subtitle={shelter.phone ? 'Shelter contact' : HSEM.label} value="Call" valueColor={colors.tint} onPress={() => void dial(phone)} accessibilityRole="link" accessibilityLabel={`Call ${pretty(phone)}`} last />
      </Group>
      <SectionFooter>Voice calls sometimes work when mobile data does not. Shelter transport: same number, or (670) 664-8000. Medical help to evacuate: CHCC (670) 234-8950.</SectionFooter>

      <SectionHeader>Facility</SectionHeader>
      <Group>
        <View style={styles.kvWrap}>
          <KeyValue k="Latest official list" v={shelter.designation === 'past' ? 'No — earlier storms only' : `Yes — ${latest.storm}`} />
          <KeyValue k="Medical support" v={shelter.medicalSupport ? `Named by the JIC (${latest.dates})` : 'Not named'} />
          <KeyValue k="Pets" v={shelter.petsAllowed ? 'Allowed' : 'Service animals only'} />
          <KeyValue k="Wheelchair access" v={yesNo(shelter.wheelchair, 'Yes', 'No')} />
          <KeyValue k="Generator" v={yesNo(shelter.generator, 'Yes', 'No')} />
          <KeyValue k="Design capacity" v={shelter.designCapacity ? `${shelter.designCapacity} people` : 'Not published'} />
          <KeyValue k="Last verified" v={`${shelter.lastVerified}`} last />
        </View>
      </Group>
      <SectionFooter>
        Source: {shelter.verifiedBy}.{shelter.coordConfidence && shelter.coordConfidence !== 'high' ? ` Map pin is approximate (${shelter.coordConfidence} confidence) — use the landmark directions.` : ''}
        {shelter.notes ? ` ${shelter.notes}` : ''}
      </SectionFooter>

      <SectionHeader right={`${household.people} people${household.pets ? `, ${household.pets} pet${household.pets > 1 ? 's' : ''}` : ''}`}>Bring from your checklist</SectionHeader>
      <Group>
        {bring.map((b, i) => (
          <Cell key={b.id} icon={checklistIcon(b.id)} iconColor={colors.green} title={b.name} last={false && i === bring.length - 1} />
        ))}
        <Cell icon="battery" iconColor={colors.green} title="Phone + power bank" />
        <Cell icon="shelter" iconColor={colors.green} title="Blanket or sleeping bag per person" last />
      </Group>
      <SectionFooter>No weapons, alcohol or smoking materials in shelters.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kvWrap: { paddingLeft: 16 },
});
