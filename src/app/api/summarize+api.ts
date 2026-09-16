/**
 * POST /api/summarize — the ONE place this app uses AI.
 *
 * Turns an official NWS alert into a single plain-English sentence (≤ 15 words) for the
 * Alert tab. Runs server-side only (expo-router API route); the API key never reaches the
 * phone. The client caches the result with the original text and falls back to the NWS
 * headline if this fails, so the app keeps working without it.
 *
 * Rules enforced here (spec "LLM 프롬프트 고정 / 출력 검증"):
 *  - restate facts from the text only; never invent instructions
 *  - ≤ 15 words, one sentence
 *  - any number in the summary must appear in the source text, otherwise the summary is rejected
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

/**
 * Model selection is a deployment decision, not a code decision (spec: "LLM 제공자·결제 수단 미결정").
 * Set SUMMARY_MODEL on the server (never EXPO_PUBLIC_) to any current Claude model id, e.g.
 * claude-opus-5 (default, strongest), claude-sonnet-5 (cheaper), claude-haiku-4-5 (cheapest).
 * Cost per alert is on the order of a cent even on Opus: ~2k input tokens + ~40 output tokens, one call per alert id, cached on the phone.
 */
const DEFAULT_MODEL = 'claude-opus-5';
export const MODEL = process.env.SUMMARY_MODEL?.trim() || DEFAULT_MODEL;
/** Server-side refusal fallback (`fallbacks: 'default'`) exists only on the Opus 5 / Fable / Mythos tier. */
const SUPPORTS_FALLBACKS = /^claude-(opus-5|fable-5|mythos-5)/.test(MODEL);
/** `output_config.effort` is accepted on Opus 4.5+, Sonnet 4.6+, Fable/Mythos; it errors on Haiku 4.5 and older models. */
const SUPPORTS_EFFORT = /^claude-(opus-5|opus-4-[5-8]|sonnet-5|sonnet-4-6|fable-5|mythos-5)/.test(MODEL);
const MAX_WORDS = 15;

const RequestSchema = z.object({
  alertId: z.string().min(1),
  event: z.string().min(1),
  headline: z.string().nullable().optional(),
  areaDesc: z.string().optional(),
  description: z.string().min(1).max(20_000),
});

const SummarySchema = z.object({
  summary: z.string().describe('One plain-English sentence, at most 15 words, restating the most important fact for a Saipan family.'),
});

const SYSTEM = `You rewrite official U.S. National Weather Service alerts for families on Saipan (Northern Mariana Islands) who may have only seconds and a dying phone.
Write exactly ONE sentence of at most ${MAX_WORDS} words, in plain English at a 6th-grade reading level.
Only restate facts that are in the alert text: what is happening, where, and when (use the alert's own day/time words, e.g. "Tuesday morning").
Do NOT add advice, instructions, numbers, or times that are not in the text. Do NOT use jargon (no "sustained", "gusts to", "mph" unless the number is in the text).
If the alert is a cancellation or all-clear, say so plainly.`;

function numbersIn(s: string): string[] {
  return (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, ''));
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Deterministic validation of the model output against the source text. */
export function validateSummary(summary: string, source: string): { ok: true; summary: string } | { ok: false; reason: string } {
  const s = summary.replace(/\s+/g, ' ').trim();
  if (!s) return { ok: false, reason: 'empty' };
  if (wordCount(s) > MAX_WORDS) return { ok: false, reason: 'too-long' };
  if ((s.match(/[.!?]/g) ?? []).length > 1 && !/\b(a\.m\.|p\.m\.)/i.test(s)) return { ok: false, reason: 'multi-sentence' };
  const srcNums = new Set(numbersIn(source));
  for (const n of numbersIn(s)) {
    if (!srcNums.has(n)) return { ok: false, reason: `number-not-in-source:${n}` };
  }
  return { ok: true, summary: s };
}

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'bad-request' }, { status: 400 });
  }

  const source = [body.event, body.headline ?? '', body.areaDesc ?? '', body.description].join('\n');
  // Credentials resolve from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return Response.json({ error: 'summary-not-configured' }, { status: 503 });
  }

  try {
    const params = {
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(SummarySchema), ...(SUPPORTS_EFFORT ? { effort: 'low' as const } : {}) },
      messages: [
        {
          role: 'user' as const,
          content: `Alert type: ${body.event}\nAreas: ${body.areaDesc ?? 'CNMI'}\nHeadline: ${body.headline ?? '(none)'}\n\nOfficial text:\n${body.description}`,
        },
      ],
    };
    // On the Opus 5 tier, opt into the server-side refusal fallback: a declined request is re-run on
    // Anthropic's recommended substitute model inside the same call. Other models use the plain endpoint.
    const response = SUPPORTS_FALLBACKS
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
      : await client.messages.create(params);

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused' }, { status: 502 });
    }
    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let parsed: z.infer<typeof SummarySchema>;
    try {
      parsed = SummarySchema.parse(JSON.parse(text));
    } catch {
      return Response.json({ error: 'unparseable' }, { status: 502 });
    }
    const v = validateSummary(parsed.summary, source);
    if (!v.ok) return Response.json({ error: 'rejected', reason: v.reason }, { status: 422 });

    return Response.json({ summary: v.summary, model: response.model, generatedAt: new Date().toISOString(), alertId: body.alertId });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: 'rate-limited' }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return Response.json({ error: 'summary-not-configured' }, { status: 503 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: 'upstream', status: err.status }, { status: 502 });
    // The SDK throws a plain Error (no typed class) when no API key, token or profile can be resolved.
    if (err instanceof Error && /resolve authentication method/i.test(err.message)) {
      return Response.json({ error: 'summary-not-configured' }, { status: 503 });
    }
    return Response.json({ error: 'unknown' }, { status: 500 });
  }
}

export function GET(): Response {
  return Response.json({ ok: true, model: MODEL, defaultModel: DEFAULT_MODEL, serverSideFallback: SUPPORTS_FALLBACKS, effort: SUPPORTS_EFFORT ? 'low' : null, maxWords: MAX_WORDS });
}
