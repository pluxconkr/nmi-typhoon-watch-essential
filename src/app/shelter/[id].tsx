/**
 * S-07 Shelter detail · all offline. No deep link to an external map app (it would fail offline).
 * Landmark directions are pre-written in the shelter data; phone numbers use tel: and the app never
 * decides whether a call will work.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { bearingDeg, compassLabel, formatDistance, haversineKm } from '@/domain/geo';
import { useAppState } from '@/store/appStore';
import { useChecklist } from '@/store/derived';
import { Body, Card, H1, Pill, SectionLabel, Small, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

const HSEM = '+16702378000';

async function dial(e164: string) {
  try {
    await Linking.openURL(`tel:${e164}`);
  } catch {
    /* no dialler (simulator / tablet) — the number is visible as text */
  }
}

export default function ShelterDetailScreen() {
  const { id } = useLocalSearchParams<'/shelter/[id]'>();
  const shelter = useAppState((s) => s.shelters.find((x) => x.shelterId === id) ?? null);
  const location = useAppState((s) => s.location);
  const { items, household } = useChecklist();

  if (!shelter) {
    return (
      <Screen title="Shelter">
        <Body>This shelter is not in the saved list.</Body>
      </Screen>
    );
  }

  const km = location ? haversineKm(location, shelter) : null;
  const dir = location ? compassLabel(bearingDeg(location, shelter)) : null;
  const bring = items.filter((i) => i.bringToShelter).map((i) => i.name);
  bring.push('Phone + power bank', 'Blanket or sleeping bag per person');
  const phone = shelter.phone ?? HSEM;

  return (
    <Screen title="Shelter">
      <View style={styles.pills}>
        <Pill tone="navy">S-07</Pill>
        <Pill tone="green">offline</Pill>
      </View>
      <H1>{shelter.name}</H1>
      <Xs style={{ marginBottom: 12 }}>
        {shelter.village}, {shelter.island.charAt(0).toUpperCase() + shelter.island.slice(1)}
        {km !== null ? ` · ${formatDistance(km)} from you (straight line, ${dir})` : ''}
      </Xs>
      <View style={styles.pills}>
        <Pill tone={shelter.petsAllowed ? 'green' : 'grey'}>{shelter.petsAllowed ? 'Pets allowed' : 'Service animals only'}</Pill>
        <Pill tone={shelter.wheelchair ? 'green' : 'grey'}>{shelter.wheelchair === true ? 'Wheelchair access' : shelter.wheelchair === false ? 'No wheelchair access' : 'Access: not confirmed'}</Pill>
        <Pill tone={shelter.generator ? 'green' : 'grey'}>{shelter.generator === true ? 'Generator' : shelter.generator === false ? 'No generator' : 'Generator: not confirmed'}</Pill>
        {shelter.designCapacity ? <Pill tone="navy">Space {shelter.designCapacity}</Pill> : null}
      </View>

      <Card>
        <SectionLabel>How to find it</SectionLabel>
        <Body>{shelter.landmarkHint}</Body>
        <Xs style={{ marginTop: 8 }}>Directions are written in advance and stored with the shelter list. There is deliberately no &quot;open in maps&quot; button — it would fail with no signal.</Xs>
      </Card>

      <Card>
        <SectionLabel>Call before you go</SectionLabel>
        <Pressable onPress={() => void dial(phone)} accessibilityRole="link" accessibilityLabel={`Call ${phone}`} hitSlop={8} style={styles.phoneBtn}>
          <Text style={styles.phone}>{phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')}</Text>
        </Pressable>
        <Xs style={{ marginTop: 6 }}>{shelter.phone ? 'Shelter contact.' : 'HSEM State Warning Point.'} Voice calls sometimes work when mobile data does not. Shelter transport: same number, or (670) 664-8000. Medical help to evacuate: CHCC (670) 234-8950.</Xs>
      </Card>

      <Card>
        <SectionLabel>Bring from your checklist</SectionLabel>
        {bring.map((b) => (
          <View key={b} style={styles.bringRow}>
            <Text style={styles.bullet}>•</Text>
            <Small>{b}</Small>
          </View>
        ))}
        <Xs style={{ marginTop: 7 }}>
          Filtered for your household ({household.people} people{household.pets ? `, ${household.pets} pet${household.pets > 1 ? 's' : ''}` : ''}{household.infants ? ', infant supplies' : ''}). Remember: no weapons, alcohol or smoking materials in shelters.
        </Xs>
      </Card>

      <Card tone="muted">
        <Xs>
          Last verified <Xs style={{ fontWeight: '800', color: colors.ink }}>{shelter.lastVerified}</Xs> · source: {shelter.verifiedBy}
        </Xs>
        {shelter.coordConfidence && shelter.coordConfidence !== 'high' ? <Xs style={{ marginTop: 4, color: colors.amber }}>Map pin position is approximate ({shelter.coordConfidence} confidence). Use the landmark directions.</Xs> : null}
        {shelter.notes ? <Xs style={{ marginTop: 4 }}>{shelter.notes}</Xs> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  phoneBtn: { minHeight: 44, justifyContent: 'center' },
  phone: { fontFamily: fonts.mono, fontSize: 20, fontWeight: '800', color: colors.navy },
  bringRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'flex-start' },
  bullet: { color: colors.green, fontWeight: '900', fontSize: 15, lineHeight: 18 },
});
