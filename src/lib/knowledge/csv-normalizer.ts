/**
 * src/lib/knowledge/csv-normalizer.ts
 *
 * Robust CSV parser and canonical schema normalizer for DSA problem datasets,
 * company interview question collections, and algorithmic explanations.
 */

import crypto from 'crypto';

export interface CanonicalDSARecord {
  problemTitle: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Unknown';
  topics: string[];
  companies: string[];
  isCompanyVerified: boolean; // false = community-reported tag
  descriptionOrExplanation: string;
  sourceUrl: string;
  language?: string;
  rowIndex: number;
  contentHash: string;
  rawMetadata: Record<string, string>;
}

export interface CSVParseResult {
  records: CanonicalDSARecord[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  headers: string[];
  errors: string[];
}

export class CSVNormalizer {
  /**
   * Parse CSV content handling quoted fields, commas inside quotes, CRLF, and escaped quotes
   */
  static parseRawCSV(csvContent: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    // Normalize newlines to \n
    const text = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i++;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Cell boundary
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !inQuotes) {
        // Row boundary
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Normalize an entire CSV dataset into canonical DSA records
   */
  static normalize(csvContent: string, sourceRepository: string, filePath: string): CSVParseResult {
    const rawRows = this.parseRawCSV(csvContent);
    const result: CSVParseResult = {
      records: [],
      totalRows: Math.max(0, rawRows.length - 1),
      validRows: 0,
      skippedRows: 0,
      headers: [],
      errors: [],
    };

    if (rawRows.length < 2) {
      result.errors.push('CSV contains no data rows');
      return result;
    }

    const headers = rawRows[0].map((h) => h.toLowerCase().trim());
    result.headers = rawRows[0];

    // Find column indices
    const titleIdx = this.findHeaderIndex(headers, ['title', 'problem_title', 'problem', 'name', 'question', 'problem_name']);
    const difficultyIdx = this.findHeaderIndex(headers, ['difficulty', 'level', 'diff', 'tier']);
    const topicsIdx = this.findHeaderIndex(headers, ['topics', 'topic', 'tags', 'tag', 'category', 'pattern', 'algorithms']);
    const companiesIdx = this.findHeaderIndex(headers, ['companies', 'company', 'company_tags', 'asked_by', 'interview_companies']);
    const descIdx = this.findHeaderIndex(headers, ['description', 'explanation', 'solution', 'content', 'notes', 'summary']);
    const urlIdx = this.findHeaderIndex(headers, ['url', 'link', 'problem_url', 'leetcode_url', 'source_url']);
    const langIdx = this.findHeaderIndex(headers, ['language', 'lang', 'programming_language']);

    if (titleIdx === -1 && descIdx === -1) {
      result.errors.push('Unable to find title or description columns in CSV headers');
      return result;
    }

    const seenHashes = new Set<string>();

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row.length === 0 || (row.length === 1 && !row[0])) {
        result.skippedRows++;
        continue;
      }

      const rawTitle = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : '';
      const rawDifficulty = difficultyIdx !== -1 && row[difficultyIdx] ? row[difficultyIdx].trim() : '';
      const rawTopics = topicsIdx !== -1 && row[topicsIdx] ? row[topicsIdx].trim() : '';
      const rawCompanies = companiesIdx !== -1 && row[companiesIdx] ? row[companiesIdx].trim() : '';
      const rawDesc = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';
      const rawUrl = urlIdx !== -1 && row[urlIdx] ? row[urlIdx].trim() : '';
      const rawLang = langIdx !== -1 && row[langIdx] ? row[langIdx].trim() : undefined;

      // Title or description is required
      const problemTitle = rawTitle || this.extractTitleFromDesc(rawDesc) || `DSA Problem ${r}`;
      const slug = this.slugify(problemTitle);
      const difficulty = this.normalizeDifficulty(rawDifficulty);
      const topics = this.parseCommaOrSemicolonList(rawTopics);
      const companies = this.parseCommaOrSemicolonList(rawCompanies);

      // Company claims are community-reported unless explicitly verified
      const isCompanyVerified = false;

      const descriptionOrExplanation = rawDesc || `Problem: ${problemTitle}. Topics: ${topics.join(', ')}.`;
      const sourceUrl = rawUrl || `https://github.com/${sourceRepository}/blob/main/${filePath}#L${r + 1}`;

      // Content Hash for deduplication
      const hashContent = `${sourceRepository}:${filePath}:${problemTitle}:${difficulty}:${topics.sort().join(',')}:${companies.sort().join(',')}`;
      const contentHash = crypto.createHash('sha256').update(hashContent).digest('hex').slice(0, 32);

      if (seenHashes.has(contentHash)) {
        result.skippedRows++;
        continue;
      }
      seenHashes.add(contentHash);

      const rawMetadata: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (row[idx]) rawMetadata[h] = row[idx];
      });

      result.records.push({
        problemTitle,
        slug,
        difficulty,
        topics: topics.length > 0 ? topics : ['Data Structures'],
        companies,
        isCompanyVerified,
        descriptionOrExplanation,
        sourceUrl,
        language: rawLang,
        rowIndex: r,
        contentHash,
        rawMetadata,
      });

      result.validRows++;
    }

    return result;
  }

  private static findHeaderIndex(headers: string[], candidates: string[]): number {
    for (const c of candidates) {
      const idx = headers.findIndex((h) => h === c || h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  static normalizeDifficulty(raw: string): 'Easy' | 'Medium' | 'Hard' | 'Unknown' {
    const l = raw.toLowerCase().trim();
    if (l === '1' || l === 'easy' || l.includes('easy')) return 'Easy';
    if (l === '2' || l === 'medium' || l.includes('medium') || l === 'med') return 'Medium';
    if (l === '3' || l === 'hard' || l.includes('hard')) return 'Hard';
    return 'Unknown';
  }

  static parseCommaOrSemicolonList(raw: string): string[] {
    if (!raw) return [];
    // Handle JSON array format if present, e.g. ["Array", "Hash Table"]
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
      } catch {
        // fallback
      }
    }

    return raw
      .split(/[,;|/]/)
      .map((s) => s.replace(/["'[\]]/g, '').trim())
      .filter((s) => s.length > 0);
  }

  static slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'problem';
  }

  private static extractTitleFromDesc(desc: string): string | null {
    if (!desc) return null;
    const match = desc.match(/^(?:#|\d+\.|\bProblem:\b)?\s*([A-Za-z0-9\s-]+?)(?:\n|\.|$)/);
    return match ? match[1].trim() : null;
  }
}
