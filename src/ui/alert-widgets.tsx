/**
 * Alert-tab widgets: hero, countdown, preparation-window timeline, task rows, plain summary.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatChstShort, formatCountdown, formatChstStamp } from '@/domain/time';
import type { PrepWindow, TaskItem } from '@/domain/types';
import { WINDOWS } from '@/domain/windows';

import { Checkbox, Xs } from './primitives';
import { MIN_TAP, colors, fonts } from './theme';

export function AlertHero({ kicker, title, sub, tone = 'red' }: { kicker: string; title: string; sub?: string | null; tone?: 'red' | 'navy' }) {
  return (
    <View style={[styles.hero, { backgroundColor: tone === 'red' ? colors.red : colors.navy }]} accessibilityRole="header">
      <Text style={styles.heroKicker}>{kicker}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      {sub ? (
        <View style={styles.heroStale}>
          <Text style={styles.heroStaleText}>{sub}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Ticks once a second from the device clock. Turns red under 6 hours. */
export function Countdown({ target, label }: { target: number; label?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = target - now;
  const soon = remaining <= 6 * 3600_000;
  return (
    <View accessibilityLiveRegion="polite">
      <Text style={[styles.countdown, soon && { color: colors.red }]} accessibilityLabel={`${formatCountdown(remaining)} remaining`}>
        {formatCountdown(remaining)}
      </Text>
      <Xs style={{ fontWeight: '600' }}>{label ?? `until damaging winds · ${formatChstShort(target)}`}</Xs>
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
              <View style={[styles.bar, i === 0 && styles.barFirst, i === WINDOWS.length - 1 && styles.barLast, done && { backgroundColor: colors.navy3 }, now && { backgroundColor: colors.red }]} />
              <Text style={[styles.barLabel, done && { color: colors.navy3 }, now && { color: colors.red }]}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.nowLabel}>
        NOW · {current} window{forced ? ' · preview' : ''}
      </Text>
    </View>
  );
}

export function TaskRow({ task, checked, onChange }: { task: TaskItem; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${task.title}${task.note ? `, ${task.note}` : ''}, ${checked ? 'done' : 'not yet done'}`} style={styles.task}>
      <Checkbox checked={checked} onChange={onChange} label={task.title} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, checked && styles.taskDone]}>{task.title}</Text>
        {task.note ? <Text style={styles.taskNote}>{task.note}</Text> : null}
      </View>
    </Pressable>
  );
}

export function PlainSummary({ summary, status, generatedAt, isDemo }: { summary: string | null; status: 'ok' | 'unavailable' | 'pending'; generatedAt: string | null; isDemo?: boolean }) {
  return (
    <View style={styles.plain}>
      <Text style={styles.plainLabel}>Plain-language summary</Text>
      <Text style={styles.plainQuote}>{summary ? `“${summary}”` : 'Auto-summary unavailable — showing the official headline instead.'}</Text>
      <Xs style={{ marginTop: 7 }}>
        {status === 'ok'
          ? `NWS Tiyan GU text, rewritten as one sentence${isDemo ? ' (demo)' : ' by our server'} · ${generatedAt ? formatChstStamp(generatedAt) : ''} · readable offline`
          : status === 'pending'
            ? 'Summary will be added when the phone is online. The official text is already saved.'
            : 'auto-summary unavailable · official text is saved and readable offline'}
      </Xs>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 18, paddingVertical: 18 },
  heroKicker: { color: colors.white, opacity: 0.92, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },
  heroStale: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  heroStaleText: { color: colors.white, fontSize: 11.5, fontWeight: '600' },
  countdown: { fontFamily: fonts.mono, fontSize: 36, fontWeight: '700', letterSpacing: -0.5, color: colors.navy },
  timeline: { flexDirection: 'row', marginTop: 14, marginBottom: 4 },
  timelineItem: { flex: 1, minHeight: MIN_TAP, justifyContent: 'flex-start' },
  bar: { height: 8, backgroundColor: colors.line, marginBottom: 7 },
  barFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  barLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  barLabel: { fontSize: 12, fontWeight: '700', color: colors.ink3, textAlign: 'center' },
  nowLabel: { fontSize: 12, color: colors.red, fontWeight: '800', marginTop: 8 },
  task: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line2, minHeight: MIN_TAP + 6 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 21 },
  taskDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  taskNote: { fontSize: 13, color: colors.navy3, fontWeight: '700', marginTop: 2 },
  plain: { backgroundColor: colors.navySoft, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13 },
  plainLabel: { fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.navy3, fontWeight: '800', marginBottom: 5 },
  plainQuote: { fontSize: 16, fontWeight: '700', lineHeight: 23, color: colors.navy },
});
