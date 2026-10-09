/**
 * "What you need to know": the few facts in an alert that matter, in short plain sentences for any reader
 * (many users are older). Deterministic — taken from the alert's own fields (event, areas, times, storm
 * name) plus fixed safety steps for each kind of alert. No AI; the AI sentence is shown separately below it.
 */
import { extractStormName, isActive, isWarning, isWatch, parseVtec, vtecIsEnded } from './nws';
import type { PhaseState } from './phase';
import { formatChstFriendly, toEpoch } from './time';
import type { StoredAlert } from './types';

export interface Essentials {
  /** What is happening, in a few words: "Typhoon Sinlaku is coming." */
  headline: string;
  /** One short sentence that follows it. */
  detail: string;
  /** Danger is red, a watch is amber; the words always say it too. */
  tone: 'danger' | 'watch' | 'ended' | 'info';
  when: { label: string; text: string } | null;
  where: string | null;
  /** At most three short steps, most important first. */
  steps: string[];
}

type Kind = 'typhoon-warning' | 'typhoon-watch' | 'storm-warning' | 'storm-watch' | 'extreme-wind' | 'tsunami-warning' | 'tsunami' | 'flash-flood' | 'flood' | 'coastal-flood' | 'surf' | 'other';

function kindOf(event: string): Kind {
  const e = event.toLowerCase();
  if (/extreme wind/.test(e)) return 'extreme-wind';
  if (/typhoon|hurricane/.test(e)) return isWarning(e) ? 'typhoon-warning' : isWatch(e) ? 'typhoon-watch' : 'other';
  if (/tropical storm/.test(e)) return isWarning(e) ? 'storm-warning' : isWatch(e) ? 'storm-watch' : 'other';
  if (/tsunami warning/.test(e)) return 'tsunami-warning';
  if (/tsunami/.test(e)) return 'tsunami';
  if (/flash flood warning/.test(e)) return 'flash-flood';
  if (/coastal flood/.test(e)) return 'coastal-flood';
  if (/flood/.test(e)) return 'flood';
  if (/high surf/.test(e)) return 'surf';
  return 'other';
}

const ISLAND_ORDER = ['Saipan', 'Tinian', 'Rota'];

/** "Rota, MP; Tinian, MP; Saipan, MP" → "Saipan, Tinian and Rota". */
export function plainAreas(areaDesc: string): string | null {
  const parts = areaDesc
    .split(';')
    .map((p) => p.replace(/,\s*MP\s*$/i, '').trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const islandsOnly = parts.every((p) => ISLAND_ORDER.includes(p));
  const list = islandsOnly ? ISLAND_ORDER.filter((i) => parts.includes(i)) : parts;
  return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** When the danger starts, as the alert gives it (the phase may have a better estimate). */
function onsetOf(a: StoredAlert): number {
  const onset = toEpoch(a.onset);
  if (Number.isFinite(onset)) return onset;
  const v = parseVtec(a.vtec);
  return v?.begin ? toEpoch(v.begin) : toEpoch(a.effective);
}

/** When the danger ends, if the alert says. Not `expires`: that is only when the next update is due. */
function endOf(a: StoredAlert): number {
  const ends = toEpoch(a.ends);
  if (Number.isFinite(ends)) return ends;
  const v = parseVtec(a.vtec);
  return v?.end ? toEpoch(v.end) : NaN;
}

const lower = (event: string) => event.toLowerCase();

/**
 * @param phase the app's phase, used when this alert is the one driving it (same countdown as the Alert tab)
 * @param newerActive another alert is in effect now (an ended watch may have become a warning)
 */
export function alertEssentials(alert: StoredAlert, now: number, phase?: PhaseState | null, newerActive = false): Essentials {
  const kind = kindOf(alert.event);
  const where = plainAreas(alert.areaDesc);
  const name = kind === 'typhoon-warning' || kind === 'typhoon-watch' || kind === 'storm-warning' || kind === 'storm-watch' || kind === 'extreme-wind' ? extractStormName(alert) : null;
  const ended = vtecIsEnded(alert.vtec) || !isActive(alert, now);

  if (ended) {
    const end = Number.isFinite(endOf(alert)) ? endOf(alert) : toEpoch(alert.expires);
    const when = Number.isFinite(end) && end <= now ? { label: 'Ended', text: formatChstFriendly(end, now) } : null;
    if (newerActive) return { headline: `This ${lower(alert.event)} has ended.`, detail: 'A newer alert is in effect. Open the Alert tab.', tone: 'ended', when, where, steps: [] };
    const afterStorm = kind === 'typhoon-warning' || kind === 'storm-warning' || kind === 'extreme-wind';
    return {
      headline: `This ${lower(alert.event)} has ended.`,
      detail: afterStorm ? 'Danger remains outside after the storm.' : 'No alert is in effect now.',
      tone: 'ended',
      when,
      where,
      steps: afterStorm ? ['Stay away from fallen power lines. They may still be live.', 'Do not drink tap water until officials say it is safe.', 'Do not drive or walk through flood water.'] : [],
    };
  }

  // Is the danger still ahead? The Alert tab's countdown decides for the alert it shows.
  const primary = phase?.primary?.alertId === alert.alertId ? phase : null;
  const onset = primary ? (primary.phase === 'before' ? primary.target : null) : onsetOf(alert);
  const ahead = onset !== null && Number.isFinite(onset) && onset > now;
  const estimate = primary?.targetSource === 'open-meteo';
  const end = endOf(alert);
  const startsAt = (label: string) => (ahead ? { label, text: `${estimate ? 'About ' : ''}${formatChstFriendly(onset!, now, { relative: true })}${estimate ? ' (estimate from the wind forecast)' : ''}` } : null);
  const until = Number.isFinite(end) && end > now ? { label: 'Until', text: formatChstFriendly(end, now, { relative: true }) } : null;
  const storm = (fallback: string) => name ?? fallback;

  switch (kind) {
    case 'typhoon-warning':
    case 'storm-warning': {
      const typhoon = kind === 'typhoon-warning';
      if (ahead) {
        return {
          headline: `${storm(typhoon ? 'A typhoon' : 'A tropical storm')} is coming.`,
          detail: typhoon ? 'Very strong, dangerous winds are expected. Get ready now.' : 'Strong winds and heavy rain are expected. Get ready now.',
          tone: 'danger',
          when: startsAt('Strong winds start'),
          where,
          steps: [
            'Finish getting ready now.',
            typhoon ? 'If your home has a metal roof or is near the shore, go to a shelter or a strong concrete building.' : 'Bring loose things inside and stay away from the shore.',
            'Once the wind starts, stay inside until the all-clear.',
          ],
        };
      }
      return {
        headline: `${storm(typhoon ? 'The typhoon' : 'The tropical storm')} is here.`,
        detail: typhoon ? 'Dangerous winds are happening now.' : 'Strong winds and heavy rain are happening now.',
        tone: 'danger',
        when: until ?? { label: 'Until', text: 'Officials give the all-clear' },
        where,
        steps: ['Stay inside, in a room with no windows.', 'If the wind stops suddenly, stay inside. It will come back.', 'Do not go out until the all-clear.'],
      };
    }
    case 'typhoon-watch':
    case 'storm-watch': {
      const typhoon = kind === 'typhoon-watch';
      return {
        headline: `${storm(typhoon ? 'A typhoon' : 'A tropical storm')} may come.`,
        detail: typhoon ? 'Dangerous winds are possible within 2 days.' : 'Strong winds are possible within 2 days.',
        tone: 'watch',
        when: startsAt('Could start'),
        where,
        steps: ['Get water, food and medicine ready now.', 'Know where your nearest shelter is.', 'Charge your phone and power banks.'],
      };
    }
    case 'extreme-wind':
      return {
        headline: 'Extreme winds now.',
        detail: 'This is life-threatening. Take cover now.',
        tone: 'danger',
        when: until,
        where,
        steps: ['Go to an inside room with no windows now.', 'Stay there until this warning ends.'],
      };
    case 'tsunami-warning':
      return { headline: 'A tsunami may hit the shore.', detail: 'Dangerous waves and flooding are possible.', tone: 'danger', when: startsAt('Waves could arrive') ?? until, where, steps: ['Move to high ground or inland now.', 'Stay away from the shore until officials say it is safe.'] };
    case 'tsunami':
      return { headline: 'Strong waves and currents at the shore.', detail: 'They can pull you out to sea.', tone: 'watch', when: until, where, steps: ['Stay out of the water and away from the shore.'] };
    case 'flash-flood':
      return { headline: 'Flash flooding now or very soon.', detail: 'Water can rise very fast.', tone: 'danger', when: until, where, steps: ['Move to higher ground now.', 'Never drive or walk through flood water.'] };
    case 'flood':
      return { headline: 'Flooding is possible.', detail: 'Heavy rain can flood low places.', tone: 'watch', when: until, where, steps: ['Stay away from streams and low places.', 'Never drive or walk through flood water.'] };
    case 'coastal-flood':
      return { headline: 'Sea water may flood the coast.', detail: 'Low roads and homes by the shore can flood.', tone: 'watch', when: until, where, steps: ['Stay away from the shore and low coastal roads.'] };
    case 'surf':
      return { headline: 'Big, dangerous waves at the reefs.', detail: 'Strong currents can pull you out.', tone: 'watch', when: until, where, steps: ['Stay out of the water and off the reefs.'] };
    default:
      return { headline: alert.event, detail: 'Read what the weather service says below.', tone: 'info', when: until, where, steps: [] };
  }
}
