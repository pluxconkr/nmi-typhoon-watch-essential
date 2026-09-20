/**
 * "Why this number?" — the multiplication behind a checklist quantity. Not AI; the rules table.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { RULES_VERSION, formatQty } from '@/domain/rules';
import { useChecklist } from '@/store/derived';
import { Button, Callout, Group, SectionFooter, SectionHeader } from '@/ui/primitives';
import { Screen, goBackOr } from '@/ui/Screen';
import { colors, fonts, tabular, type } from '@/ui/theme';

export default function WhyScreen() {
  const { itemId } = useLocalSearchParams<'/why/[itemId]'>();
  const router = useRouter();
  const { items } = useChecklist();
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return (
      <Screen title="Why this number?" fallback="/checklist">
        <Callout icon="checklist" title="Not in your checklist any more" />
        <Button title="Close" style={{ marginTop: 12 }} onPress={() => goBackOr(router, '/checklist')} />
      </Screen>
    );
  }

  return (
    <Screen title="Why this number?" fallback="/checklist" largeTitle={item.qty === null ? item.name : formatQty(item)} subtitle={item.qty === null ? 'Presence only' : item.name}>
      <SectionHeader>The formula</SectionHeader>
      <Group padded>
        <Text style={[styles.formula, tabular]} accessibilityLabel={`Formula: ${item.formula}`}>
          {item.formula}
        </Text>
      </Group>
      <SectionHeader>Why</SectionHeader>
      <Group padded>
        <Text style={type.body}>{item.why}</Text>
      </Group>
      <SectionFooter>Source: {item.source}</SectionFooter>
      <SectionFooter>Quantities come from a multiplication table, not from AI. The same input always gives the same result, and the formula is shown here. In a disaster, a number that cannot explain itself is not trusted. Rules version {RULES_VERSION}.</SectionFooter>
      <Button title="Got it" onPress={() => goBackOr(router, '/checklist')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formula: { fontFamily: fonts.rounded, fontSize: 22, lineHeight: 28, fontWeight: '600', color: colors.ink },
});
