/**
 * Alert-tab widgets: countdown, preparation-window timeline, task rows, plain summary.
 * Reference points: Reminders list rows, Clock timer numerals.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatChstShort, formatChstStamp, formatCountdown } from '@/domain/time';
import type { PrepWindow, TaskItem } from '@/domain/types';
import { WINDOWS, WINDOW_LABEL } from '@/domain/windows';

import { Checkbox } from './primitives';
import { MIN_TAP, colors, fonts, tabular, type } from './theme';

/** Ticks once a second from the device clock. Turns red under 6 hours. */
export function Countdown({ target, source }: { target: number; source?: 'nws-onset' | 'nws-effective' | 'open-meteo' | 'vtec' | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = target - now;
  const soon = remaining <= 6 * 3600_000;
  return (
    <View accessibilityLiveRegion="polite">
      <Text style={type.subheadline}>Damaging winds expected in</Text>
      <Text style={[styles.countdown, tabular, soon && { color: colors.red }]} accessibilityLabel={`${formatCountdown(remaining)} remaining`}>
        {formatCountdown(remaining)}
      </Text>
      <Text style={type.footnote}>
        {formatChstShort(target)}
        {source === 'open-meteo' ? ' · estimated from forecast wind' : source === 'nws-effective' ? ' · from alert timing' : ''}
      </Text>
    </View>
  );
}

export function WindowTimeline({ current, onSelect, forced }: { current: PrepWindow; onSelect?: (w: PrepWindow) => void; forced?: PrepWindow | null }) {
  const cur = WINDOWS.indexOf(current);
  return (
    <View>
      <View style={styles.timeline} accessibilityRole="tablist">
        {WINDOWS.map((w, i) => {
          const done = i < cur;
          const now = i === cur;
          return (
            <Pressable
              key={w}
              onPress={onSelect ? () => onSelect(w) : undefined}
              accessibilityRole="tab"
              accessibilityState={{ selected: now }}
              accessibilityLabel={`${w} window${now ? ', current' : done ? ', passed' : ''}`}
              style={styles.timelineItem}>
              <View style={[styles.bar, done && { backgroundColor: colors.tint }, now && { backgroundColor: colors.red }]} />
              <Text style={[styles.barLabel, tabular, done && { color: colors.tint }, now && { color: colors.red, fontWeight: '600' }]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.nowRow}>
        <Text style={styles.nowLabel}>
          NOW · {current} window{forced ? ' · preview' : ''}
        </Text>
        <Text style={type.footnote}>{WINDOW_LABEL[current]}</Text>
      </View>
    </View>
  );
}

/** Reminders-style row: circle control, title, secondary line. */
export function TaskRow({ task, checked, onChange, last }: { task: TaskItem; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${task.title}${task.note ? `, ${task.note}` : ''}, ${checked ? 'done' : 'not yet done'}`}
      style={({ pressed }) => [styles.task, pressed && { backgroundColor: colors.fill }]}>
      <Checkbox checked={checked} onChange={onChange} label={task.title} />
      <View style={[styles.taskBody, !last && styles.taskSeparator]}>
        <Text style={[type.body, checked && styles.taskDone]}>{task.title}</Text>
        {task.note ? <Text style={[type.footnote, { marginTop: 2 }]}>{task.note}</Text> : null}
      </View>
    </Pressable>
  );
}

export function PlainSummary({ summary, status, generatedAt, isDemo }: { summary: string | null; status: 'ok' | 'unavailable' | 'pending'; generatedAt: string | null; isDemo?: boolean }) {
  return (
    <View>
      <Text style={styles.plainQuote}>{summary ?? 'Auto-summary unavailable — showing the official headline instead.'}</Text>
      <Text style={[type.footnote, { marginTop: 8 }]}>
        {status === 'ok'
          ? `One sentence from the NWS Tiyan GU text${isDemo ? ' (demo)' : ', checked against it on our server'}${generatedAt ? ` · ${formatChstStamp(generatedAt)}` : ''}`
          : status === 'pending'
            ? 'Summary will be added when the phone is online. The official text is already saved.'
            : 'Auto-summary unavailable · official text is saved and readable offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: { fontFamily: fonts.rounded, fontSize: 52, lineHeight: 60, fontWeight: '600', color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
  timeline: { flexDirection: 'row', gap: 6, marginTop: 10 },
  timelineItem: { flex: 1, minHeight: MIN_TAP - 8, justifyContent: 'flex-start' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.fill },
  barLabel: { ...type.footnote, textAlign: 'center', marginTop: 8 },
  nowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 },
  nowLabel: { ...type.footnote, color: colors.red, fontWeight: '600' },
  task: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 12 },
  taskBody: { flex: 1, paddingVertical: 12, paddingRight: 16, minHeight: MIN_TAP },
  taskSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  taskDone: { color: colors.ink2, textDecorationLine: 'line-through' },
  plainQuote: { ...type.title3, marginTop: 6 },
});
