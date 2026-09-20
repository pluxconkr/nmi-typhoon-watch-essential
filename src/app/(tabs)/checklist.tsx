/**
 * S-04 Checklist · household-based preparation list (tab 2). Reminders-style rows.
 * Quantities come from the rules table; "Why this number?" shows the multiplication.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { checklistProgress, describeHousehold, formatQty, shortfall } from '@/domain/rules';
import type { ChecklistItem } from '@/domain/types';
import { actions, useAppState } from '@/store/appStore';
import { useChecklist, usePhase } from '@/store/derived';
import { Icon, checklistIcon } from '@/ui/icons';
import { Button, Callout, Cell, Checkbox, Group, ProgressRing, SectionFooter, SectionHeader, Subhead } from '@/ui/primitives';
import { Screen } from '@/ui/Screen';
import { CELL_PAD, MIN_TAP, colors, tabular, type } from '@/ui/theme';

const ALWAYS = new Set(['water', 'food', 'meds', 'batt', 'cash', 'docs']);

export default function ChecklistScreen() {
  const router = useRouter();
  const { household, items, state } = useChecklist();
  const onboarded = useAppState((s) => s.onboarded);
  const { phase } = usePhase();
  const progress = checklistProgress(items, state);
  const usingDefault = household.updatedAt === '1970-01-01T00:00:00.000Z';
  const always = items.filter((i) => ALWAYS.has(i.id));
  const conditional = items.filter((i) => !ALWAYS.has(i.id));

  const renderItem = (item: ChecklistItem, last: boolean) => {
    const st = state[item.id];
    const done = !!st?.done;
    const more = shortfall(item, st);
    return (
      <View key={item.id} style={styles.item}>
        <Checkbox checked={done} onChange={(v) => actions.toggleChecklistItem(item.id, v, item.qty, item.unit)} label={`${item.name}, ${formatQty(item)}, ${done ? 'done' : 'not yet done'}`} />
        <Pressable
          onPress={() => router.push({ pathname: '/why/[itemId]', params: { itemId: item.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Why ${formatQty(item)} for ${item.name}?`}
          style={({ pressed }) => [styles.itemBody, !last && styles.separator, pressed && styles.pressed]}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Icon name={checklistIcon(item.id)} size={16} color={done ? colors.ink4 : colors.tint} />
              <Text style={[type.body, done && styles.done]}>{item.name}</Text>
            </View>
            {more !== null ? <Text style={[type.footnote, { color: colors.red, marginTop: 2 }]}>{`${more} ${item.unit} more needed since your household grew`}</Text> : null}
          </View>
          <Text style={[styles.qty, tabular, done && { color: colors.ink4 }]}>{formatQty(item)}</Text>
          <Icon name="chevron" size={14} color={colors.ink4} weight="semibold" />
        </Pressable>
      </View>
    );
  };

  return (
    <Screen largeTitle="Checklist" subtitle={`${household.prepDays}-day supply · ${describeHousehold(household)}`} testID="checklist">
      {onboarded && usingDefault ? (
        <Callout icon="people" tone="amber" title="Using a 2-person default">
          <Subhead>Tell us who lives with you so the quantities below match your home.</Subhead>
          <Button title="Set up household" variant="tonal" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/household')} />
        </Callout>
      ) : null}

      <Group style={{ marginTop: 8 }}>
        <Cell
          leading={
            <ProgressRing pct={progress.pct} size={44} stroke={4} color={progress.pct === 0 ? colors.ink4 : colors.green}>
              <Text style={[styles.ringPct, tabular, progress.pct === 0 && { color: colors.ink2 }]}>{progress.pct}%</Text>
            </ProgressRing>
          }
          title={describeHousehold(household)}
          subtitle={`${progress.done} of ${progress.total} items ready · ${household.prepDays}-day supply`}
          accessory="chevron"
          onPress={() => router.push('/household')}
          testID="household-card"
          last
        />
      </Group>

      {phase === 'during' ? (
        <Callout icon="alert" tone="red" title="Storm in progress">
          <Subhead>This is what you already have. Do not go out to buy anything now.</Subhead>
        </Callout>
      ) : null}

      <SectionHeader>Every household</SectionHeader>
      <Group>{always.map((it, i) => renderItem(it, i === always.length - 1))}</Group>

      {conditional.length > 0 ? (
        <>
          <SectionHeader>Added for your home</SectionHeader>
          <Group>{conditional.map((it, i) => renderItem(it, i === conditional.length - 1))}</Group>
        </>
      ) : null}

      {progress.pct === 100 ? (
        <Callout icon="checkCircle" tone="green" title="Supplies ready">
          <Subhead>Next: make sure the shelter list and map are saved on this phone.</Subhead>
          <Button title="Check offline data" variant="green" size="sm" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/downloads')} />
        </Callout>
      ) : null}

      <SectionFooter>Tap an item to see the formula behind its quantity. Saved on this phone — works with no signal. Checked items survive app restart and power loss.</SectionFooter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ringPct: { fontSize: 11, fontWeight: '600', color: colors.green },
  item: { flexDirection: 'row', alignItems: 'center', paddingLeft: CELL_PAD, gap: 12 },
  itemBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: CELL_PAD, minHeight: MIN_TAP },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  done: { color: colors.ink2, textDecorationLine: 'line-through' },
  pressed: { backgroundColor: colors.fill },
  qty: { ...type.body, color: colors.ink2 },
});
