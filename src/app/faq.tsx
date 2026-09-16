/**
 * S-09 During-storm FAQ · 100% static, bundled, offline. No search box — big buttons named after situations.
 */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { faqRepo } from '@/data/repos';
import { Body, Card, Pill, SectionLabel, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors } from '@/ui/theme';

export default function FaqScreen() {
  const { section } = useLocalSearchParams<'/faq', { section?: string }>();
  const entries = faqRepo.get();
  const [open, setOpen] = useState<string | null>(section === 'after' ? 'fema-apply' : null);
  const during = entries.filter((e) => e.section === 'during');
  const after = entries.filter((e) => e.section === 'after');

  const render = (list: typeof entries) =>
    list.map((f) => {
      const on = open === f.id;
      return (
        <Pressable key={f.id} onPress={() => setOpen(on ? null : f.id)} accessibilityRole="button" accessibilityState={{ expanded: on }} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
          <Text style={styles.title}>{f.title}</Text>
          {on ? (
            <View style={{ marginTop: 8 }}>
              <Body>{f.body}</Body>
              <Xs style={{ marginTop: 8 }}>Source: {f.source}</Xs>
            </View>
          ) : null}
        </Pressable>
      );
    });

  return (
    <Screen title="What do I do if…">
      <View style={styles.pills}>
        <Pill tone="navy">S-09</Pill>
        <Pill tone="green">bundled · always offline</Pill>
      </View>
      <Card tone="navy">
        <Text style={styles.numbers}>911 · (670) 237-8000</Text>
        <Xs style={{ color: colors.navyMuted }}>CUC outage line (670) 236-4333</Xs>
        <Xs style={{ color: colors.navyMuted }}>Emergency · CNMI HSEM State Warning Point</Xs>
      </Card>
      <Xs style={{ marginBottom: 12 }}>No search box. During a typhoon you should not have to think of a search term — just the name of what is happening.</Xs>
      <SectionLabel>During the storm</SectionLabel>
      {render(during)}
      <SectionLabel style={{ marginTop: 10 }}>After the storm</SectionLabel>
      {render(after)}
      <Xs style={{ marginTop: 6, marginBottom: 16 }}>Guidance follows public FEMA, CDC, American Red Cross and NWS material. Nothing here is medical advice — call 911 for injuries.</Xs>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  numbers: { fontSize: 18, fontWeight: '800', color: colors.white },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 11, minHeight: 56, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.navy },
});
