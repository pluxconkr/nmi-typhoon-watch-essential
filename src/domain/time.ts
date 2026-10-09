/**
 * Time helpers. Chamorro Standard Time (ChST) is UTC+10 with no daylight saving,
 * so we format by fixed-offset arithmetic instead of Intl. That gives identical
 * output on every device and OS, and makes the timezone test (T9) a pure unit test.
 */

export const CHST_OFFSET_MS = 10 * 60 * 60 * 1000;
export const CHST_LABEL = 'ChST';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parse an ISO 8601 string (with or without offset) to epoch ms; NaN if invalid. */
export function toEpoch(iso: string | number | null | undefined): number {
  if (iso === null || iso === undefined) return NaN;
  if (typeof iso === 'number') return iso;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

function chstParts(epochMs: number) {
  const d = new Date(epochMs + CHST_OFFSET_MS);
  return {
    weekday: DAYS[d.getUTCDay()],
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()],
    monthIndex: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "Fri 07 Sep 08:00 ChST" */
export function formatChst(input: string | number | null | undefined, opts: { seconds?: boolean } = {}): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return '—';
  const p = chstParts(ms);
  const time = `${pad2(p.hour)}:${pad2(p.minute)}`;
  const sec = opts.seconds ? `:${pad2(new Date(ms + CHST_OFFSET_MS).getUTCSeconds())}` : '';
  return `${p.weekday} ${pad2(p.day)} ${p.month} ${time}${sec} ${CHST_LABEL}`;
}

/** "2026-09-05 14:02 ChST" — compact, monospace-friendly. */
export function formatChstStamp(input: string | number | null | undefined): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return '—';
  const p = chstParts(ms);
  return `${p.year}-${pad2(p.monthIndex + 1)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)} ${CHST_LABEL}`;
}

/** "2026-09-05" in ChST. */
export function formatChstDate(input: string | number | null | undefined): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return '—';
  const p = chstParts(ms);
  return `${p.year}-${pad2(p.monthIndex + 1)}-${pad2(p.day)}`;
}

/** "Fri 08:00 ChST" — short form for countdown labels. */
export function formatChstShort(input: string | number | null | undefined): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return '—';
  const p = chstParts(ms);
  return `${p.weekday} ${pad2(p.hour)}:${pad2(p.minute)} ${CHST_LABEL}`;
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const chstDay = (ms: number) => Math.floor((ms + CHST_OFFSET_MS) / 86_400_000);

/**
 * A time the way people say it, for the plainest screens (ChST): "Today, 3:00 PM", "Tomorrow, 9:30 AM",
 * "Monday 13 April, 3:00 PM". With `relative`, a time in the next 3 days also says "(in about 18 hours)".
 */
export function formatChstFriendly(input: string | number | null | undefined, now: number = Date.now(), opts: { relative?: boolean } = {}): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms + CHST_OFFSET_MS);
  const days = chstDay(ms) - chstDay(now);
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : `${FULL_DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${FULL_MONTHS[d.getUTCMonth()]}`;
  const h = d.getUTCHours();
  const time = `${h % 12 === 0 ? 12 : h % 12}:${pad2(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  let rel = '';
  if (opts.relative && ms > now && ms - now < 3 * 86_400_000) {
    const min = Math.max(1, Math.round((ms - now) / 60_000));
    const hours = Math.round(min / 60);
    rel = min < 60 ? ` (in about ${min} minute${min === 1 ? '' : 's'})` : ` (in about ${hours} hour${hours === 1 ? '' : 's'})`;
  }
  return `${day}, ${time}${rel}`;
}

/** Relative age: "just now", "5 min ago", "3 hours ago", "2 days ago". */
export function relativeAgo(input: string | number | null | undefined, now: number = Date.now()): string {
  const ms = toEpoch(input);
  if (!Number.isFinite(ms)) return 'never';
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** Cached data older than this is flagged amber. */
export const STALE_AFTER_DAYS = 7;

export function isStale(fetchedAt: string | number | null | undefined, now: number = Date.now(), days = STALE_AFTER_DAYS): boolean {
  const ms = toEpoch(fetchedAt);
  if (!Number.isFinite(ms)) return true;
  return now - ms > days * 24 * 3600_000;
}

/** "42h 10m 05s" (never negative). */
export function formatCountdown(msRemaining: number): string {
  const ms = Math.max(0, msRemaining);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}h ${pad2(m)}m ${pad2(s)}s`;
}

export function hoursBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / 3_600_000;
}

export function nowIso(now: number = Date.now()): string {
  return new Date(now).toISOString();
}

/**
 * Detect whether the device clock is set to ChST. Uses the local offset of `now`
 * (getTimezoneOffset returns minutes WEST of UTC, so ChST = -600).
 */
export function deviceIsChst(now: number = Date.now()): boolean {
  return new Date(now).getTimezoneOffset() === -600;
}
