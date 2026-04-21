import type { LLMInput } from './llm.types';

export function buildOutreachPrompt(input: LLMInput): string {
  return `You are an expert B2B outreach copywriter. Generate personalised outreach content for the following contact.

Contact Details:
- Name: ${input.name}
- Company: ${input.company}
- Industry: ${input.industry}
- City: ${input.city}

Rules:
- opening_line: 1 sentence max 30 words, references their industry and city naturally
- email: 3 short paragraphs, no subject line, no sign-off, conversational but professional
- subject_lines: exactly 2 items — first is curiosity-driven, second is benefit-driven

Return ONLY a valid JSON object. No preamble, no markdown fences, no extra text.

{
  "opening_line": "...",
  "email": "...",
  "subject_lines": ["...", "..."]
}`;
}