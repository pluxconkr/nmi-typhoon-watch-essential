/**
 * S-07 Shelter detail · all offline. No deep link to an external map app (it would fail offline).
 * Landmark directions are pre-written in the shelter data; phone numbers use tel: and the app never
 * decides whether a call will work.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CONTACTS } from '@/domain/contacts';
import { bearingDeg, compassLabel, formatDistance, haversineKm } from '@/domain/geo';
import { useAppState } from '@/store/appStore';
import { useChecklist } from '@/store/derived';
import { checklistIcon } from '@/ui/icons';
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
  const phone = shelter.phone ?? HSEM.e164;
  const islandName = shelter.island.charAt(0).toUpperCase() + shelter.island.slice(1);
  const yesNo = (v: boolean | null, yes: string, no: string) => (v === true ? yes : v === false ? no : 'Not confirmed');

  return (
    <Screen title="Shelter" fallback="/shelter" largeTitle={shelter.name} subtitle={`${shelter.village}, ${islandName}${km !== null ? ` · ${formatDistance(km)} away, ${dir}` : ''}`}>
      <SectionHeader>How to find it</SectionHeader>
      <Group padded>
        <Text style={type.body}>{shelter.landmarkHint}</Text>
      </Group>
      <SectionFooter>Directions are written in advance and stored with the shelter list. There is deliberately no &quot;open in maps&quot; button — it would fail with no signal.</SectionFooter>

      <SectionHeader>Call before you go</SectionHeader>
      <Group>
        <Cell icon="phone" title={pretty(phone)} subtitle={shelter.phone ? 'Shelter contact' : HSEM.label} value="Call" valueColor={colors.tint} onPress={() => void dial(phone)} accessibilityRole="link" accessibilityLabel={`Call ${pretty(phone)}`} last />
      </Group>
      <SectionFooter>Voice calls sometimes work when mobile data does not. Shelter transport: same number, or (670) 664-8000. Medical help to evacuate: CHCC (670) 234-8950.</SectionFooter>

      <SectionHeader>Facility</SectionHeader>
      <Group>
        <View style={styles.kvWrap}>
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
