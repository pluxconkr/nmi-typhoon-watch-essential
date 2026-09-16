/**
 * Client for the one and only AI feature: a one-sentence plain-language summary of an
 * official alert, produced server-side by the /api/summarize route. The key never
 * touches the phone. Any failure → null; the UI falls back to the NWS headline.
 */
import type { StoredAlert } from '@/domain/types';

/** Generous: free-tier models on OpenRouter can take 20–40 s, and the server may retry once. Background work only. */
const TIMEOUT_MS = 120_000;

/** Optional absolute origin for production builds; relative URL works in development. */
const SUMMARY_URL = process.env.EXPO_PUBLIC_SUMMARY_URL ?? '/api/summarize';

export interface SummaryResponse {
  summary: string;
  model: string;
  generatedAt: string;
}

export async function requestSummary(alert: Pick<StoredAlert, 'alertId' | 'event' | 'headline' | 'description' | 'areaDesc'>): Promise<SummaryResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SUMMARY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        alertId: alert.alertId,
        event: alert.event,
        headline: alert.headline,
        areaDesc: alert.areaDesc,
        description: alert.description,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<SummaryResponse> & { error?: string };
    if (!body || typeof body.summary !== 'string' || body.summary.trim().length === 0) return null;
    return { summary: body.summary.trim(), model: body.model ?? 'unknown', generatedAt: body.generatedAt ?? new Date().toISOString() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
