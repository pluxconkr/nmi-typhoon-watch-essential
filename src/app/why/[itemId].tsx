/**
 * "Why this number?" — the multiplication behind a checklist quantity. Not AI; the rules table.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { RULES_VERSION, formatQty } from '@/domain/rules';
import { useChecklist } from '@/store/derived';
import { Body, Button, Card, H1, SectionLabel, Small, Xs } from '@/ui/primitives';
import { Screen, goBackOr } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

export default function WhyScreen() {
  const { itemId } = useLocalSearchParams<'/why/[itemId]'>();
  const router = useRouter();
  const { items } = useChecklist();
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return (
      <Screen title="Why this number?">
        <Body>This item is not in your checklist any more.</Body>
        <Button title="Close" style={{ marginTop: 12 }} onPress={() => goBackOr(router, '/checklist')} />
      </Screen>
    );
  }

  return (
    <Screen title="Why this number?">
      <H1>Why {item.qty === null ? 'this item' : formatQty(item)}?</H1>
      <Xs style={{ marginBottom: 10 }}>{item.name}</Xs>
      <View style={styles.formula} accessibilityLabel={`Formula: ${item.formula}`}>
        <Text style={styles.formulaText}>{item.formula}</Text>
      </View>
      <Body style={{ marginTop: 12 }}>{item.why}</Body>
      <Small style={{ marginTop: 8, color: colors.ink3 }}>Source: {item.source}</Small>

      <Card tone="muted" style={{ marginTop: 16 }}>
        <SectionLabel>Why this screen exists</SectionLabel>
        <Xs>
          Quantities come from a multiplication table, not from AI. The same input always gives the same result, and the formula can be shown right here. In a disaster, a number that cannot explain itself is not trusted.
        </Xs>
        <Text style={styles.version}>rulesVersion {RULES_VERSION} · src/domain/rules.ts</Text>
      </Card>
      <Button title="Got it" onPress={() => goBackOr(router, '/checklist')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formula: { backgroundColor: colors.navySoft, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  formulaText: { fontFamily: fonts.mono, fontSize: 15, fontWeight: '700', color: colors.navy },
  version: { fontFamily: fonts.mono, fontSize: 11, color: colors.ink3, marginTop: 8 },
});
