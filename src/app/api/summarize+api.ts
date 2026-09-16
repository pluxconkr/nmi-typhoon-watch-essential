/**
 * POST /api/summarize — the ONE place this app uses AI.
 *
 * Turns an official NWS alert into a single plain-English sentence for the Alert tab.
 * Runs server-side only (expo-router API route); the API key never reaches the phone.
 * The client caches the result with the original text and falls back to the NWS headline
 * if this fails, so the app keeps working without it.
 *
 * Provider: OpenRouter (https://openrouter.ai) — one key, any model. The model is a deployment
 * setting (SUMMARY_MODEL), so the choice of vendor/model and billing can be made later without
 * touching the app. Fallback models are tried in order when the primary is down, rate-limited, or
 * cannot produce a valid sentence.
 *
 * Rules enforced here (spec "LLM 프롬프트 고정 / 출력 검증"):
 *  - restate facts from the text only; never invent instructions
 *  - one sentence; 15 words is the target, 20 is the hard cap (one "shorten it" retry in between)
 *  - any number in the summary must appear in the source text, otherwise the summary is rejected
 *  - temperature 0; model reasoning disabled (small models otherwise leak their chain of thought)
 */
import { z } from 'zod';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-5';
const DEFAULT_FALLBACKS = 'google/gemini-3.8-flash,openai/gpt-5.6-terra';
/** Per upstream call. Free-tier models can take 20–40 s; summaries are background work on the phone. */
const TIMEOUT_MS = 45_000;
export const TARGET_WORDS = 15;
export const MAX_WORDS = 20;

/** OpenRouter model slug, e.g. anthropic/claude-sonnet-5, openai/gpt-5.6-terra, google/gemini-3.8-flash. */
export const MODEL = process.env.SUMMARY_MODEL?.trim() || DEFAULT_MODEL;
/** Tried in order when the primary errors, is rate-limited, or fails validation twice. */
export const FALLBACK_MODELS = (process.env.SUMMARY_FALLBACK_MODELS ?? DEFAULT_FALLBACKS)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && s !== MODEL);

const RequestSchema = z.object({
  alertId: z.string().min(1),
  event: z.string().min(1),
  headline: z.string().nullable().optional(),
  areaDesc: z.string().optional(),
  description: z.string().min(1).max(20_000),
});

const SYSTEM = `You rewrite official U.S. National Weather Service alerts for families on Saipan (Northern Mariana Islands) who may have only seconds and a dying phone.
Write exactly ONE sentence of at most ${TARGET_WORDS} words, in plain English at a 6th-grade reading level.
Only restate facts that are in the alert text: what is happening, where, and when (use the alert's own day/time words, e.g. "Tuesday morning").
Do NOT add advice, instructions, numbers, or times that are not in the text. Do NOT use jargon (no "sustained", "gusts to", "mph" unless the number is in the text).
If the alert is a cancellation or all-clear, say so plainly.
Reply with the sentence only — no quotes, no preamble, no markdown, no explanation of your reasoning.`;

function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Strip wrapping quotes / bullets / markdown a model might add despite instructions. */
export function cleanModelText(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]\s*)?/, '')
    .replace(/^["'“”‘’`]+|["'“”‘’`]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First sentence of a multi-sentence reply (keeps "a.m."/"p.m." intact). */
export function firstSentence(s: string): string {
  const shielded = s.replace(/\b([ap])\.m\./gi, '$1<M>');
  const m = shielded.match(/^(.*?[.!?])(?=\s+[A-Z"“(]|\s*$)/);
  return (m ? m[1] : shielded).replace(/([ap])<M>/gi, '$1.m.');
}

/** Deterministic validation of the model output against the source text. */
export function validateSummary(summary: string, source: string): { ok: true; summary: string } | { ok: false; reason: string } {
  const s = cleanModelText(summary);
  if (!s) return { ok: false, reason: 'empty' };
  if (wordCount(s) > MAX_WORDS) return { ok: false, reason: 'too-long' };
  if ((s.match(/[.!?]/g) ?? []).length > 1 && !/\b(a\.m\.|p\.m\.)/i.test(s)) return { ok: false, reason: 'multi-sentence' };
  const srcNums = new Set(numbersIn(source));
  for (const n of numbersIn(s)) {
    if (!srcNums.has(n)) return { ok: false, reason: `number-not-in-source:${n}` };
  }
  return { ok: true, summary: s };
}

/** Validate; if the reply is too long or multi-sentence, try its first sentence before giving up. */
export function validateWithFirstSentence(summary: string, source: string) {
  const v = validateSummary(summary, source);
  if (v.ok || (v.reason !== 'too-long' && v.reason !== 'multi-sentence')) return v;
  const fs = firstSentence(cleanModelText(summary));
  if (fs !== cleanModelText(summary)) {
    const v2 = validateSummary(fs, source);
    if (v2.ok) return v2;
  }
  return v;
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: { message?: { content?: string | { type: string; text?: string }[] }; finish_reason?: string }[];
  error?: { code?: number | string; message?: string };
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function contentToText(c: OpenRouterResponse['choices']): string {
  const m = c?.[0]?.message?.content;
  if (typeof m === 'string') return m;
  if (Array.isArray(m)) return m.map((p) => p.text ?? '').join(' ');
  return '';
}

/**
 * Reasoning settings tried in order while a model answers 400 (parameter not supported):
 * small open models leak their chain of thought unless reasoning is disabled; Gemini refuses
 * to disable it ("Reasoning is mandatory") but accepts a low effort; a few accept neither.
 */
const REASONING_LADDER: (Record<string, unknown> | null)[] = [{ enabled: false, exclude: true }, { effort: 'low', exclude: true }, null];

type Attempt = { res: Response; data: OpenRouterResponse };

/** One model, walking the reasoning ladder while it answers 400 (parameter not supported). */
async function completeWith(model: string, apiKey: string, messages: ChatMessage[], signal: AbortSignal): Promise<Attempt> {
  let last: Attempt | null = null;
  for (const reasoning of REASONING_LADDER) {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'NMI Typhoon Watch' },
      body: JSON.stringify({ model, messages, max_tokens: 200, temperature: 0, ...(reasoning ? { reasoning } : {}) }),
    });
    const data = (await res.json().catch(() => ({}))) as OpenRouterResponse;
    last = { res, data };
    if (res.status !== 400) break;
  }
  return last!;
}

type Outcome =
  | { ok: true; summary: string; model: string; attempts: number }
  | { ok: false; status: number; error: string; detail?: string; reason?: string; attempts: number; fatal?: boolean };

/** Ask one model for a summary, validate, and allow one "shorten it" repair round. */
async function summarizeWith(model: string, apiKey: string, messages: ChatMessage[], source: string, signal: AbortSignal): Promise<Outcome> {
  const first = await completeWith(model, apiKey, messages, signal);
  if (!first.res.ok) {
    const detail = first.data.error?.message ?? first.res.statusText;
    const st = first.res.status;
    // Auth / billing problems are account-wide: stop trying other models.
    if (st === 401 || st === 403) return { ok: false, status: 503, error: 'summary-not-configured', detail, attempts: 1, fatal: true };
    if (st === 402) return { ok: false, status: 503, error: 'insufficient-credits', detail, attempts: 1, fatal: true };
    if (st === 429) return { ok: false, status: 429, error: 'rate-limited', detail, attempts: 1 };
    return { ok: false, status: 502, error: 'upstream', detail: `${st} ${detail}`, attempts: 1 };
  }
  if (first.data.choices?.[0]?.finish_reason === 'content_filter') return { ok: false, status: 502, error: 'refused', attempts: 1 };

  let raw = contentToText(first.data.choices);
  let v = validateWithFirstSentence(raw, source);
  let attempts = 1;
  let usedModel = first.data.model ?? model;

  if (!v.ok && (v.reason === 'too-long' || v.reason === 'multi-sentence' || v.reason === 'empty')) {
    const nudge =
      v.reason === 'empty'
        ? `Reply now with ONE sentence of at most ${TARGET_WORDS} words. Nothing else.`
        : `That was ${wordCount(cleanModelText(raw))} words. Rewrite it as ONE sentence of at most 12 words, keeping only facts from the alert. Reply with the sentence only.`;
    const retry = await completeWith(model, apiKey, [...messages, ...(raw ? [{ role: 'assistant' as const, content: raw }] : []), { role: 'user', content: nudge }], signal);
    attempts = 2;
    if (retry.res.ok) {
      raw = contentToText(retry.data.choices);
      v = validateWithFirstSentence(raw, source);
      usedModel = retry.data.model ?? model;
    }
  }
  if (!v.ok) return { ok: false, status: 422, error: 'rejected', reason: v.reason, attempts };
  return { ok: true, summary: v.summary, model: usedModel, attempts };
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'bad-request' }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return Response.json({ error: 'summary-not-configured' }, { status: 503 });

  const source = [body.event, body.headline ?? '', body.areaDesc ?? '', body.description].join('\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS * 2);
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Alert type: ${body.event}\nAreas: ${body.areaDesc ?? 'CNMI'}\nHeadline: ${body.headline ?? '(none)'}\n\nOfficial text:\n${body.description}` },
  ];

  try {
    // Primary first, then each fallback. A model moves on when it is down, rate-limited,
    // or cannot produce a valid sentence even after one repair round.
    const tried: { model: string; error: string; reason?: string; detail?: string }[] = [];
    let lastFail: Extract<Outcome, { ok: false }> = { ok: false, status: 503, error: 'summary-not-configured', attempts: 0 };
    for (const model of [MODEL, ...FALLBACK_MODELS]) {
      const out = await summarizeWith(model, apiKey, messages, source, controller.signal);
      if (out.ok) {
        return Response.json({ summary: out.summary, model: out.model, attempts: out.attempts, triedBefore: tried, generatedAt: new Date().toISOString(), alertId: body.alertId });
      }
      lastFail = out;
      tried.push({ model, error: out.error, reason: out.reason, detail: out.detail });
      if (out.fatal) break;
    }
    return Response.json({ error: lastFail.error, reason: lastFail.reason, detail: lastFail.detail, tried }, { status: lastFail.status });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return Response.json({ error: 'timeout' }, { status: 504 });
    return Response.json({ error: 'unknown' }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}

export function GET(): Response {
  return Response.json({
    ok: true,
    provider: 'openrouter',
    model: MODEL,
    fallbackModels: FALLBACK_MODELS,
    defaultModel: DEFAULT_MODEL,
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    targetWords: TARGET_WORDS,
    maxWords: MAX_WORDS,
  });
}
