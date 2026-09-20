/**
 * S-05 Household editor. Draft → live preview of what changes ("Water 60 L → 84 L") → commit.
 * Cancel discards everything. Checked items are preserved; only quantities are recomputed.
 */
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HOUSEHOLD_LIMITS, PREP_DAY_OPTIONS, diffChecklists } from '@/domain/rules';
import type { Household, PrepDays } from '@/domain/types';
import { actions, useAppState } from '@/store/appStore';
import { Button, Group, SectionFooter, SectionHeader, Segmented, Stepper, Toggle } from '@/ui/primitives';
import { Screen, goBackOr } from '@/ui/Screen';
import { CELL_PAD, colors, tabular, type } from '@/ui/theme';

export default function HouseholdScreen() {
  const router = useRouter();
  const current = useAppState((s) => s.household);
  const [draft, setDraft] = useState<Household>({ ...current });
  const set = <K extends keyof Household>(k: K, v: Household[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const diffs = useMemo(() => diffChecklists(current, draft), [current, draft]);

  const save = () => {
    actions.saveHousehold(draft);
    goBackOr(router, '/checklist');
  };

  return (
    <Screen title="Your household" fallback="/checklist" largeTitle="Your household">
      <SectionHeader>Who lives with you</SectionHeader>
      <Group>
        <Stepper icon="people" label="People in household" value={draft.people} min={HOUSEHOLD_LIMITS.people.min} max={HOUSEHOLD_LIMITS.people.max} onChange={(v) => set('people', v)} />
        <Stepper icon="elder" label="Elderly or medical needs" value={draft.elders} min={HOUSEHOLD_LIMITS.elders.min} max={HOUSEHOLD_LIMITS.elders.max} onChange={(v) => set('elders', v)} hint="7-day medicine rule, extra water" />
        <Stepper icon="baby" label="Infants under 2" value={draft.infants} min={HOUSEHOLD_LIMITS.infants.min} max={HOUSEHOLD_LIMITS.infants.max} onChange={(v) => set('infants', v)} hint="Formula & diapers" />
        <Stepper icon="pet" label="Pets" value={draft.pets} min={HOUSEHOLD_LIMITS.pets.min} max={HOUSEHOLD_LIMITS.pets.max} onChange={(v) => set('pets', v)} hint="Pet food & water" />
        <Toggle icon="generator" label="Generator at home" value={draft.generator} onChange={(v) => set('generator', v)} hint="Halves batteries, adds fuel" last />
      </Group>

      <SectionHeader>Supply period</SectionHeader>
      <Group padded>
        <Segmented<PrepDays> label="Supply period" options={PREP_DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))} value={draft.prepDays} onChange={(v) => set('prepDays', v)} />
      </Group>
      <SectionFooter>3 days is the CDC / Red Cross minimum. Saipan outages after Yutu and Sinlaku lasted weeks — 14 days is realistic.</SectionFooter>

      <SectionHeader>What will change</SectionHeader>
      <Group>
        {diffs.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={type.subheadline}>No changes yet. Adjust a number above.</Text>
          </View>
        ) : (
          diffs.map((d, i) => (
            <View key={d.id} style={[styles.diffRow, i !== diffs.length - 1 && styles.separator]} accessibilityLabel={`${d.name}: ${d.from} to ${d.to}`}>
              <Text style={[type.body, { flexShrink: 1 }]}>{d.name}</Text>
              <Text style={[type.body, tabular, { color: colors.ink2 }]}>
                {d.from} <Text style={{ color: colors.ink4 }}>→</Text> <Text style={{ color: d.kind === 'removed' ? colors.ink2 : colors.ink, fontWeight: '600' }}>{d.to}</Text>
              </Text>
            </View>
          ))
        )}
      </Group>
      <SectionFooter>Items you already checked stay checked. If a quantity grows, the checklist shows how much more you need.</SectionFooter>

      <Button title="Save changes" onPress={save} testID="household-save" style={{ marginTop: 8 }} />
      <Button title="Cancel" variant="ghost" style={{ marginTop: 6 }} onPress={() => goBackOr(router, '/checklist')} />
      <SectionFooter style={{ textAlign: 'center' }}>Saved on this phone first. No signal needed.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyRow: { paddingHorizontal: CELL_PAD, paddingVertical: 12 },
  diffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11, marginLeft: CELL_PAD, paddingRight: CELL_PAD },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
