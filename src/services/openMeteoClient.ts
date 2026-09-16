/**
 * Open-Meteo hourly wind forecast for the fixed Saipan island coordinate.
 * Never send the user's GPS position here. CC BY 4.0 — attribution is stored with the data.
 * Free tier: 600/min, 5,000/h, 10,000/day, non-commercial only. We fetch at most a few times a day.
 */
import type { WindForecast, WindHour } from '@/domain/types';

export const SAIPAN_POINT = { lat: 15.18, lon: 145.75 } as const;
const TIMEOUT_MS = 10_000;

export function buildForecastUrl(days = 7): string {
  const p = new URLSearchParams({
    latitude: String(SAIPAN_POINT.lat),
    longitude: String(SAIPAN_POINT.lon),
    current: 'wind_speed_10m,wind_gusts_10m,precipitation',
    hourly: 'wind_speed_10m,wind_gusts_10m,precipitation',
    timezone: 'Pacific/Saipan',
    forecast_days: String(days),
    wind_speed_unit: 'mph',
    timeformat: 'unixtime',
  });
  return `https://api.open-meteo.com/v1/forecast?${p.toString()}`;
}

export interface OpenMeteoRaw {
  latitude: number;
  longitude: number;
  elevation: number;
  utc_offset_seconds: number;
  error?: true;
  reason?: string;
  hourly?: {
    time: number[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    precipitation?: (number | null)[];
  };
  current?: { time: number; wind_speed_10m: number | null; wind_gusts_10m: number | null; precipitation: number | null };
}

export function normalizeForecast(raw: OpenMeteoRaw, fetchedAt: number = Date.now()): WindForecast {
  if (raw.error) throw new Error(`open-meteo: ${raw.reason ?? 'error'}`);
  const h = raw.hourly;
  if (!h || !Array.isArray(h.time) || h.time.length === 0) throw new Error('open-meteo: missing hourly');
  const hourly: WindHour[] = h.time.map((t, i) => ({
    t: t * 1000,
    wind: h.wind_speed_10m?.[i] ?? null,
    gust: h.wind_gusts_10m?.[i] ?? null,
    precip: h.precipitation?.[i] ?? null,
  }));
  return {
    v: 1,
    fetchedAt,
    utcOffsetSeconds: raw.utc_offset_seconds,
    grid: { lat: raw.latitude, lon: raw.longitude, elevationM: raw.elevation },
    hourly,
    current: raw.current
      ? { t: raw.current.time * 1000, wind: raw.current.wind_speed_10m, gust: raw.current.wind_gusts_10m, precip: raw.current.precipitation }
      : undefined,
    attribution: 'Weather data by Open-Meteo.com',
    attributionUrl: 'https://open-meteo.com/',
  };
}

export async function fetchForecast(signal?: AbortSignal): Promise<WindForecast> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const res = await fetch(buildForecastUrl(), { headers: { Accept: 'application/json' }, signal: controller.signal });
    const body = (await res.json()) as OpenMeteoRaw;
    if (!res.ok || body.error) throw new Error(`open-meteo HTTP ${res.status}: ${body.reason ?? ''}`);
    return normalizeForecast(body);
  } finally {
    clearTimeout(timer);
  }
}
