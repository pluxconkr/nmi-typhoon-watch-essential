/**
 * S-00 Onboarding · household setup. One-time, ~30 seconds. No name, email or phone.
 * Works with no signal (local write first). Skip → 2-person default + banner on the Checklist tab.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_HOUSEHOLD, HOUSEHOLD_LIMITS, PREP_DAY_OPTIONS } from '@/domain/rules';
import type { Household, PrepDays } from '@/domain/types';
import { actions, useAppState } from '@/store/appStore';
import { Body, Button, Card, H1, Pill, SectionLabel, Segmented, Stepper, Toggle, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const existing = useAppState((s) => s.household);
  const [draft, setDraft] = useState<Household>({ ...DEFAULT_HOUSEHOLD, ...existing, people: existing.people || 2 });
  const set = <K extends keyof Household>(k: K, v: Household[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const finish = (h: Household) => {
    actions.saveHousehold(h, { finishOnboarding: true });
    router.replace('/');
  };

  return (
    <Screen testID="onboarding">
      <Pill tone="navy" style={{ marginBottom: 10 }}>
        S-00 · SET UP ONCE
      </Pill>
      <H1>Who lives with you?</H1>
      <Body style={{ color: colors.ink3, marginTop: 6, marginBottom: 14 }}>
        We use this once, to work out how much water and medicine your home needs. No name, email or phone number is collected.
      </Body>

      <Card>
        <Stepper label="People in household" value={draft.people} min={HOUSEHOLD_LIMITS.people.min} max={HOUSEHOLD_LIMITS.people.max} onChange={(v) => set('people', v)} />
        <Stepper label="Elderly or medical needs" value={draft.elders} min={HOUSEHOLD_LIMITS.elders.min} max={HOUSEHOLD_LIMITS.elders.max} onChange={(v) => set('elders', v)} hint="Adds a 7-day medicine rule and extra water" />
        <Stepper label="Infants under 2" value={draft.infants} min={HOUSEHOLD_LIMITS.infants.min} max={HOUSEHOLD_LIMITS.infants.max} onChange={(v) => set('infants', v)} hint="Adds formula & diapers" />
        <Stepper label="Pets" value={draft.pets} min={HOUSEHOLD_LIMITS.pets.min} max={HOUSEHOLD_LIMITS.pets.max} onChange={(v) => set('pets', v)} hint="Adds pet food & water" />
        <Toggle label="Generator at home" value={draft.generator} onChange={(v) => set('generator', v)} hint="Halves batteries, adds a fuel item" />
      </Card>

      <Card>
        <SectionLabel>Supply period</SectionLabel>
        <Segmented<PrepDays> label="Supply period" options={PREP_DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))} value={draft.prepDays} onChange={(v) => set('prepDays', v)} />
        <Xs style={{ marginTop: 8 }}>
          3 days is the CDC / Red Cross minimum. After Yutu (2018) and Sinlaku (2026) many Saipan homes had no power for weeks — <Xs style={{ fontWeight: '800', color: colors.ink }}>14 days</Xs> is realistic.
        </Xs>
      </Card>

      <View style={styles.actions}>
        <Button title="Save and continue" onPress={() => finish(draft)} testID="onboarding-save" />
        <Button title="Skip for now" variant="ghost" onPress={() => finish({ ...DEFAULT_HOUSEHOLD })} testID="onboarding-skip" />
        <Xs style={{ textAlign: 'center', marginTop: 4 }}>Works without a signal — saved on this phone first.</Xs>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 9, marginTop: 4 },
});
