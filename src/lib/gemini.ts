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

export interface GeminiFriendlyError {
  status: number;
  message: string;
}

/**
 * Centralized Gemini error handler.
 * Converts error states into user-friendly clean strings and logs full response on the server.
 */
export function handleGeminiError(error: any): GeminiFriendlyError {
  console.error("Gemini Error:", error);

  let status = 500;
  let message = "Something went wrong while generating AI content.";

  if (error) {
    // Attempt to extract status code
    if (typeof error.status === 'number') {
      status = error.status;
    } else if (typeof error.statusCode === 'number') {
      status = error.statusCode;
    } else if (typeof error.code === 'number') {
      status = error.code;
    } else {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('429') || msg.includes('quota') || msg.includes('limit exceeded')) {
        status = 429;
      } else if (msg.includes('400') || msg.includes('invalid argument') || msg.includes('bad request')) {
        status = 400;
      } else if (msg.includes('401') || msg.includes('403') || msg.includes('api key') || msg.includes('auth') || msg.includes('unauthorized')) {
        status = 401;
      } else if (msg.includes('500') || msg.includes('internal') || msg.includes('service error')) {
        status = 500;
      } else if (msg.includes('timeout') || msg.includes('deadline') || msg.includes('abort')) {
        status = 408;
      }
    }

    const msg = String(error.message || '').toLowerCase();
    if (status === 429) {
      message = "AI service is busy. Please try again shortly.";
    } else if (status === 400) {
      message = "Unable to process your request.";
    } else if (status === 401 || status === 403) {
      message = "AI service authentication failed.";
    } else if (status === 500) {
      message = "Temporary AI service issue.";
    } else if (status === 408 || msg.includes('timeout') || msg.includes('deadline')) {
      message = "Connection to AI service timed out.";
    } else {
      message = "Something went wrong while generating AI content.";
    }
  }

  return { status, message };
}

/**
 * Calls Gemini to generate learning sheet content.
 * Handles 429 rate limit retries with exponential backoff (1s, 2s, 4s).
 *
 * @param prompt - The fully-built prompt string
 * @returns Raw JSON string extracted from the model response
 * @throws Error if the API call fails after retries
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const ai = getClient();
  let lastError: any = null;
  const backoffs = [1000, 2000, 4000]; // 1s, 2s, 4s backoff delays

  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    try {
      if (attempt > 0) {
        const delay = backoffs[attempt - 1];
        logger.info(`🔄 Gemini retry attempt ${attempt}/${backoffs.length} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
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
    } catch (error: any) {
      lastError = error;
      
      logger.error(`❌ Gemini API error (attempt ${attempt + 1})`, {
        error: error instanceof Error ? error.message : String(error),
      });

      const msg = String(error.message || '').toLowerCase();
      const status = error.status || error.statusCode || error.code || 0;
      const is429 = status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('limit exceeded');

      // Fail immediately on non-rate-limit errors
      if (!is429) {
        throw error;
      }
    }
  }

  throw lastError || new Error('AI service is busy. Please try again shortly.');
}

/** Returns the currently configured model name */
export function getGeminiModel(): string {
  return GEMINI_MODEL;
}
