/**
 * S-09 During-storm FAQ · 100% static, bundled, offline. No search box — big rows named after situations.
 */
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { faqRepo } from '@/data/repos';
import { CONTACTS } from '@/domain/contacts';
import { faqIcon } from '@/ui/icons';
import { Cell, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { CELL_PAD, colors, type } from '@/ui/theme';

async function dial(e164: string) {
  try {
    await Linking.openURL(`tel:${e164}`);
  } catch {
    /* no dialler */
  }
}

export default function FaqScreen() {
  const { section } = useLocalSearchParams<'/faq', { section?: string }>();
  const entries = faqRepo.get();
  const [open, setOpen] = useState<string | null>(section === 'after' ? 'fema-apply' : null);
  const during = entries.filter((e) => e.section === 'during');
  const after = entries.filter((e) => e.section === 'after');
  const swp = CONTACTS.find((c) => c.id === 'hsem-swp')!;
  const cuc = CONTACTS.find((c) => c.id === 'cuc-outage')!;

  const render = (list: typeof entries) => (
    <Group>
      {list.map((f, i) => {
        const on = open === f.id;
        return (
          <View key={f.id}>
            <Cell icon={faqIcon(f.id)} iconColor={on ? colors.tint : colors.ink} title={<Text style={type.headline}>{f.title}</Text>} accessory={on ? 'none' : 'chevron'} onPress={() => setOpen(on ? null : f.id)} accessibilityState={{ expanded: on }} last={on || i === list.length - 1} />
            {on ? (
              <View style={[styles.body, i !== list.length - 1 && styles.bodySeparator]}>
                <Text style={type.body}>{f.body}</Text>
                <Text style={[type.footnote, { marginTop: 8 }]}>Source: {f.source}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </Group>
  );

  return (
    <Screen title="What do I do if…" largeTitle="What do I do if…" subtitle="Bundled with the app · always offline">
      <SectionHeader>Emergency</SectionHeader>
      <Group>
        <Cell icon="phone" iconColor={colors.red} title={`911 · ${swp.display}`} subtitle="Police · Fire · Medical · CNMI HSEM State Warning Point" value="Call" valueColor={colors.tint} onPress={() => void dial(swp.e164)} accessibilityRole="link" accessibilityLabel={`Call ${swp.label} ${swp.display}`} />
        <Cell icon="power" title="CUC outage line" subtitle="Power and water" value={cuc.display} valueColor={colors.tint} onPress={() => void dial(cuc.e164)} accessibilityRole="link" accessibilityLabel={`Call CUC ${cuc.display}`} last />
      </Group>
      <SectionHeader>During the storm</SectionHeader>
      {render(during)}
      <SectionHeader>After the storm</SectionHeader>
      {render(after)}
      <SectionFooter>No search box — during a typhoon you should not have to think of a search term, just the name of what is happening. Guidance follows public FEMA, CDC, American Red Cross and NWS material. Nothing here is medical advice; call 911 for injuries.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: CELL_PAD, paddingBottom: 14, paddingTop: 2 },
  bodySeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
