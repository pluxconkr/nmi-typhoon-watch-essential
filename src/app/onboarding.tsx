/**
 * S-00 Onboarding · household setup. One-time, ~30 seconds. No name, email or phone.
 * Works with no signal (local write first). Skip → 2-person default + banner on the Checklist tab.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { DEFAULT_HOUSEHOLD, HOUSEHOLD_LIMITS, PREP_DAY_OPTIONS } from '@/domain/rules';
import type { Household, PrepDays } from '@/domain/types';
import { actions, useAppState } from '@/store/appStore';
import { Button, Group, SectionFooter, SectionHeader, Segmented, Stepper, Toggle } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';

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
    <Screen testID="onboarding" largeTitle="Who lives with you?" subtitle="One time, about 30 seconds. We use this to work out how much water and medicine your home needs.">
      <SectionHeader>Household</SectionHeader>
      <Group>
        <Stepper icon="people" label="People in household" value={draft.people} min={HOUSEHOLD_LIMITS.people.min} max={HOUSEHOLD_LIMITS.people.max} onChange={(v) => set('people', v)} />
        <Stepper icon="elder" label="Elderly or medical needs" value={draft.elders} min={HOUSEHOLD_LIMITS.elders.min} max={HOUSEHOLD_LIMITS.elders.max} onChange={(v) => set('elders', v)} hint="Adds a 7-day medicine rule and extra water" />
        <Stepper icon="baby" label="Infants under 2" value={draft.infants} min={HOUSEHOLD_LIMITS.infants.min} max={HOUSEHOLD_LIMITS.infants.max} onChange={(v) => set('infants', v)} hint="Adds formula & diapers" />
        <Stepper icon="pet" label="Pets" value={draft.pets} min={HOUSEHOLD_LIMITS.pets.min} max={HOUSEHOLD_LIMITS.pets.max} onChange={(v) => set('pets', v)} hint="Adds pet food & water" />
        <Toggle icon="generator" label="Generator at home" value={draft.generator} onChange={(v) => set('generator', v)} hint="Halves batteries, adds a fuel item" last />
      </Group>
      <SectionFooter>No name, email or phone number is collected. Everything stays on this phone.</SectionFooter>

      <SectionHeader>Supply period</SectionHeader>
      <Group padded>
        <Segmented<PrepDays> label="Supply period" options={PREP_DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))} value={draft.prepDays} onChange={(v) => set('prepDays', v)} />
      </Group>
      <SectionFooter>3 days is the CDC / Red Cross minimum. After Yutu (2018) and Sinlaku (2026) many Saipan homes had no power for weeks — 14 days is realistic.</SectionFooter>

      <Button title="Save and continue" onPress={() => finish(draft)} testID="onboarding-save" style={{ marginTop: 8 }} />
      <Button title="Skip for now" variant="ghost" style={{ marginTop: 6 }} onPress={() => finish({ ...DEFAULT_HOUSEHOLD })} testID="onboarding-skip" />
      <SectionFooter style={{ textAlign: 'center' }}>Works without a signal — saved on this phone first.</SectionFooter>
    </Screen>
  );
}
