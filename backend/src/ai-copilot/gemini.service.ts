import { Injectable, Logger } from '@nestjs/common';

/**
 * Gemini transport for the AI CFO Copilot.
 *
 * Exposes a small `isConfigured` / `complete()` surface, so AiCopilotService is
 * decoupled from the provider and switching providers stays a one-line change
 * in the module.
 *
 * Uses the REST endpoint directly rather than the SDK — the request shape is a
 * single JSON POST, and one fewer dependency is worth more here than a thin
 * client wrapper.
 */

/** Flash, not Pro: pro-latest is quota-limited on the free tier and 429s. */
const MODEL = 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — the AI CFO Copilot will return a configuration error rather than a fabricated answer.',
      );
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(
    system: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    query: string,
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on this server.');
    }

    const body = {
      // Gemini takes the system prompt as its own field, not as a leading turn.
      system_instruction: { parts: [{ text: system }] },
      contents: [
        // Gemini's roles are user/model, not user/assistant — the stored history
        // has to be mapped on the way in or every prior turn is rejected.
        ...history.slice(-8).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: query }] },
      ],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Translate the operator-fixable failures into plain sentences; anything
      // else keeps its raw shape so it can be diagnosed from the logs.
      if (res.status === 400 && /API key not valid/i.test(detail)) {
        throw new Error('The configured GEMINI_API_KEY was rejected. Check the key in the backend environment.');
      }
      if (res.status === 429) {
        throw new Error('The AI service is rate-limited right now (free-tier quota). Try again shortly.');
      }
      if (res.status === 404) {
        throw new Error(`The configured model (${MODEL}) is unavailable to this key.`);
      }
      this.logger.error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
      throw new Error(`Gemini request failed (${res.status}).`);
    }

    const data: any = await res.json();
    const cand = data?.candidates?.[0];

    // A safety block returns 200 with no parts — reading parts[0] blindly throws.
    if (!cand || cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') {
      return "I can't help with that particular request. Ask me anything about your receivables, cash position, client risk or collections and I'll dig in.";
    }

    const text = (cand.content?.parts ?? [])
      .map((p: any) => p?.text ?? '')
      .join('')
      .trim();

    return text || 'I did not get a usable response back. Try rephrasing that?';
  }
}
