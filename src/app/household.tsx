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
import { Button, Card, Pill, SectionLabel, Segmented, Stepper, Toggle, Xs } from '@/ui/primitives';
import { Screen, goBackOr } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

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
    <Screen title="Your household">
      <Pill tone="navy" style={{ marginBottom: 10 }}>
        S-05 · EDIT
      </Pill>
      <Card>
        <Stepper label="People in household" value={draft.people} min={HOUSEHOLD_LIMITS.people.min} max={HOUSEHOLD_LIMITS.people.max} onChange={(v) => set('people', v)} />
        <Stepper label="Elderly or medical needs" value={draft.elders} min={HOUSEHOLD_LIMITS.elders.min} max={HOUSEHOLD_LIMITS.elders.max} onChange={(v) => set('elders', v)} />
        <Stepper label="Infants under 2" value={draft.infants} min={HOUSEHOLD_LIMITS.infants.min} max={HOUSEHOLD_LIMITS.infants.max} onChange={(v) => set('infants', v)} />
        <Stepper label="Pets" value={draft.pets} min={HOUSEHOLD_LIMITS.pets.min} max={HOUSEHOLD_LIMITS.pets.max} onChange={(v) => set('pets', v)} />
        <Toggle label="Generator at home" value={draft.generator} onChange={(v) => set('generator', v)} />
      </Card>
      <Card>
        <SectionLabel>Supply period</SectionLabel>
        <Segmented<PrepDays> label="Supply period" options={PREP_DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))} value={draft.prepDays} onChange={(v) => set('prepDays', v)} />
      </Card>

      <Card style={{ borderColor: diffs.length ? colors.navy3 : colors.line }}>
        <SectionLabel>What will change</SectionLabel>
        {diffs.length === 0 ? (
          <Xs>No changes yet. Adjust a number above.</Xs>
        ) : (
          diffs.map((d) => (
            <View key={d.id} style={styles.diffRow} accessibilityLabel={`${d.name}: ${d.from} to ${d.to}`}>
              <Text style={styles.diffName}>{d.name}</Text>
              <Text style={styles.diffVal}>
                <Text style={{ color: colors.ink3 }}>{d.from}</Text> → <Text style={{ color: d.kind === 'removed' ? colors.ink3 : colors.navy, fontWeight: '800' }}>{d.to}</Text>
              </Text>
            </View>
          ))
        )}
        <Xs style={{ marginTop: 9 }}>Items you already checked stay checked. If a quantity grows, the checklist shows how much more you need.</Xs>
      </Card>

      <Button title="Save changes" onPress={save} testID="household-save" />
      <Button title="Cancel" variant="ghost" style={{ marginTop: 9 }} onPress={() => goBackOr(router, '/checklist')} />
      <Xs style={{ textAlign: 'center', marginTop: 12 }}>Saved on this phone first. No signal needed.</Xs>
    </Screen>
  );
}

const styles = StyleSheet.create({
  diffRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  diffName: { fontSize: 14, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  diffVal: { fontFamily: fonts.mono, fontSize: 13.5, color: colors.ink },
});
