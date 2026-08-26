/**
 * src/lib/intelligence/execution/execution-normalizer.ts
 * Formats inputs and outputs into human-readable, consistent string representations.
 */

export function normalizeInputToString(input: Record<string, unknown>): string {
  if (!input || typeof input !== 'object') return String(input);

  const parts = Object.entries(input).map(([key, val]) => {
    return `${key} = ${JSON.stringify(val)}`;
  });

  return parts.join(', ');
}

export function formatOutput(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  return JSON.stringify(val);
}
