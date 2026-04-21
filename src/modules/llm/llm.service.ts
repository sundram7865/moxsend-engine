import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { sleep } from '@/shared/utils/sleep.utils';
import { buildOutreachPrompt } from './llm.prompts';
import type { LLMInput, LLMOutput } from './llm.types';

// Grok uses OpenAI-compatible API
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-beta';

export async function generateOutreach(input: LLMInput): Promise<LLMOutput> {
  if (env.LLM_MODE === 'mock') {
    return mockGenerate(input);
  }
  return grokGenerate(input);
}

// ── Grok ──────────────────────────────────────────────────────────────────────

async function grokGenerate(input: LLMInput): Promise<LLMOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.LLM_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert B2B outreach copywriter. Always respond with valid JSON only — no preamble, no markdown fences.',
          },
          {
            role: 'user',
            content: buildOutreachPrompt(input),
          },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Grok API timed out after ${env.LLM_TIMEOUT_MS}ms for row ${input.rowIndex}`);
    }
    throw new Error(`Grok API request failed for row ${input.rowIndex}: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Grok API returned ${response.status} for row ${input.rowIndex}: ${errBody.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const rawText = data.choices?.[0]?.message?.content ?? '';

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Grok returned invalid JSON for row ${input.rowIndex}: ${cleaned.slice(0, 120)}`,
    );
  }

  return validateAndMapOutput(parsed, input.rowIndex);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateAndMapOutput(parsed: unknown, rowIndex: number): LLMOutput {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`LLM output is not an object for row ${rowIndex}`);
  }

  const obj = parsed as Record<string, unknown>;

  const missing: string[] = [];
  if (!obj.opening_line) missing.push('opening_line');
  if (!obj.email) missing.push('email');
  if (!obj.subject_lines) missing.push('subject_lines');

  if (missing.length > 0) {
    throw new Error(`LLM output missing fields [${missing.join(', ')}] for row ${rowIndex}`);
  }

  if (
    !Array.isArray(obj.subject_lines) ||
    obj.subject_lines.length < 2 ||
    typeof obj.subject_lines[0] !== 'string' ||
    typeof obj.subject_lines[1] !== 'string'
  ) {
    throw new Error(`subject_lines must be an array of 2 strings for row ${rowIndex}`);
  }

  return {
    openingLine: String(obj.opening_line),
    email: String(obj.email),
    subjectLines: [String(obj.subject_lines[0]), String(obj.subject_lines[1])],
  };
}

// ── Mock ──────────────────────────────────────────────────────────────────────

async function mockGenerate(input: LLMInput): Promise<LLMOutput> {
  await sleep(400 + Math.random() * 400);

  logger.debug(`[MOCK LLM] Generating for row ${input.rowIndex} — ${input.name}`);

  return {
    openingLine: `${input.name}, the ${input.industry} space in ${input.city} is evolving fast — and ${input.company} looks like exactly the kind of company that should be leading that shift.`,
    email: `Hi ${input.name},\n\nI've been following what ${input.company} is doing in the ${input.industry} sector and it's clear you're building something meaningful in ${input.city}.\n\nMoxsend helps teams like yours send hyper-personalised outreach automatically — turning your prospect list into booked meetings without manual effort.\n\nWould a 15-minute call this week make sense to explore if there's a fit?`,
    subjectLines: [
      `How ${input.company} can fill its pipeline on autopilot`,
      `${input.industry} outreach that actually gets replies — ${input.city}`,
    ],
  };
}