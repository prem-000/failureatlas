/**
 * Gemini AI Client
 *
 * Lightweight wrapper around the Google Gemini SDK for generating
 * structured learning sheet content. Handles retries, rate limits,
 * and JSON extraction from model responses.
 */

import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

// ─── Client singleton ─────────────────────────────────────────────────────────

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env.local file.');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return client;
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Extracts JSON from a Gemini response that may be wrapped in
 * markdown code fences (```json ... ```) or contain leading text.
 */
function extractJSON(raw: string): string {
  // Try to find a JSON code block first
  const codeBlockMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON (starts with { and ends with })
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  // Return as-is, the parser will handle validation
  return raw.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calls Gemini to generate learning sheet content.
 *
 * @param prompt - The fully-built prompt string
 * @returns Raw JSON string extracted from the model response
 * @throws Error if the API call fails after retries
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const ai = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`🔄 Gemini retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }

      logger.info('🤖 Calling Gemini API', { model: GEMINI_MODEL, promptLength: prompt.length });

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      const json = extractJSON(text);
      logger.info('✅ Gemini response received', { responseLength: json.length });
      return json;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`❌ Gemini API error (attempt ${attempt + 1})`, {
        error: lastError.message,
      });

      // Don't retry on auth errors
      if (lastError.message.includes('API key') || lastError.message.includes('401')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Gemini API call failed');
}

/** Returns the currently configured model name */
export function getGeminiModel(): string {
  return GEMINI_MODEL;
}
