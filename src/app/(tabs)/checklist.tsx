/**
 * S-04 Checklist · household-based preparation list (tab 2).
 * Quantities come from the rules table; "Why this number?" shows the multiplication.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { checklistProgress, describeHousehold, formatQty, shortfall } from '@/domain/rules';
import { actions, useAppState } from '@/store/appStore';
import { useChecklist, usePhase } from '@/store/derived';
import { Button, Card, Checkbox, LinkRow, Pill, ProgressBar, SectionLabel, Small, Xs } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { colors, fonts } from '@/ui/theme';

export default function ChecklistScreen() {
  const router = useRouter();
  const { household, items, state } = useChecklist();
  const onboarded = useAppState((s) => s.onboarded);
  const { phase } = usePhase();
  const progress = checklistProgress(items, state);
  const usingDefault = household.updatedAt === '1970-01-01T00:00:00.000Z';

  return (
    <Screen testID="checklist">
      {onboarded && usingDefault ? (
        <Card tone="amber">
          <SectionLabel color={colors.amber}>Using a 2-person default</SectionLabel>
          <Small>Tell us who lives with you so the quantities below match your home.</Small>
          <Button title="Set up household" variant="ghost" style={{ marginTop: 10 }} onPress={() => router.push('/household')} />
        </Card>
      ) : null}

      <LinkRow
        title={describeHousehold(household)}
        subtitle={`${household.prepDays}-day supply period · tap to change`}
        onPress={() => router.push('/household')}
      />

      <Card>
        <View style={styles.progressHead}>
          <SectionLabel style={{ marginBottom: 0 }}>Preparation progress</SectionLabel>
          <Text style={styles.pct}>{progress.pct}%</Text>
        </View>
        <ProgressBar pct={progress.pct} label={`${progress.done} of ${progress.total} items ready`} />
        <Xs style={{ marginTop: 7 }}>{progress.done} of {progress.total} items ready</Xs>
      </Card>

      <Card>
        <SectionLabel>Auto-calculated for you</SectionLabel>
        {phase === 'during' ? <Xs style={{ marginBottom: 8 }}>Storm in progress — this is what you already have. Do not go out to buy anything now.</Xs> : null}
        {items.map((item) => {
          const st = state[item.id];
          const done = !!st?.done;
          const more = shortfall(item, st);
          return (
            <View key={item.id} style={styles.item}>
              <Checkbox
                checked={done}
                onChange={(v) => actions.toggleChecklistItem(item.id, v, item.qty, item.unit)}
                label={`${item.name}, ${formatQty(item)}, ${done ? 'done' : 'not yet done'}`}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemTitle, done && styles.itemDone]}>{item.name}</Text>
                  {item.required ? <Pill tone="red">required</Pill> : null}
                </View>
                {more !== null ? (
                  <Xs style={{ color: colors.red, fontWeight: '800' }}>
                    {more} {item.unit} more needed since your household grew
                  </Xs>
                ) : null}
                <Pressable onPress={() => router.push({ pathname: '/why/[itemId]', params: { itemId: item.id } })} accessibilityRole="button" accessibilityLabel={`Why ${formatQty(item)} for ${item.name}?`} hitSlop={8} style={styles.whyBtn}>
                  <Text style={styles.why}>Why this number?</Text>
                </Pressable>
              </View>
              <Text style={styles.amt} accessibilityLabel={formatQty(item)}>
                {formatQty(item)}
              </Text>
            </View>
          );
        })}
      </Card>

      {progress.pct === 100 ? (
        <Card tone="green">
          <SectionLabel color={colors.green}>Supplies ready</SectionLabel>
          <Small style={{ fontWeight: '700', marginBottom: 9 }}>Next: make sure the shelter list and map are saved on this phone.</Small>
          <Button title="Check offline data →" variant="green" onPress={() => router.push('/downloads')} />
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerMain}>✓ Saved on this phone — works with no signal</Text>
        <Xs style={{ marginTop: 3 }}>Checked items survive app restart and power loss.</Xs>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  pct: { fontFamily: fonts.mono, fontSize: 18, fontWeight: '800', color: colors.green },
  item: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line2 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  itemDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  whyBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  why: { fontSize: 12.5, color: colors.ink3, textDecorationLine: 'underline' },
  amt: { fontFamily: fonts.mono, fontSize: 14, fontWeight: '700', color: colors.navy, textAlign: 'right', paddingTop: 2, minWidth: 56 },
  footer: { alignItems: 'center', paddingVertical: 8 },
  footerMain: { fontSize: 13, color: colors.green, fontWeight: '800' },
});
