import { prisma } from '@/lib/db/prisma';

/**
 * Generate a mock embedding vector (useful when API keys are not provided in dev env)
 */
function generateMockEmbedding(text: string, dimensions: number = 1536): number[] {
  const vector: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i) * 10000;
    vector.push(val - Math.floor(val));
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / (magnitude || 1));
}

/**
 * Generate semantic embedding using in-memory mock generator
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[] | null> {
  return generateMockEmbedding(text, model === 'text-embedding-3-large' ? 3072 : 1536);
}

/**
 * Preprocess failure description to optimize embedding generation
 */
export function buildFailureEmbeddingContent(
  problemTitle: string,
  difficulty: string,
  topics: string[],
  status: string,
  code: string,
  error?: string
): string {
  const parts = [
    `Problem: ${problemTitle} (${difficulty})`,
    `Topics: ${topics.join(', ')}`,
    `Status: ${status}`,
  ];
  
  if (error) {
    parts.push(`Error Context: ${error}`);
  }
  
  const codeLines = code.split('\n');
  const codeSnippet = codeLines.length > 20
    ? [...codeLines.slice(0, 10), '... [omitted lines] ...', ...codeLines.slice(-10)].join('\n')
    : code;
    
  parts.push(`Code structure: ${codeSnippet}`);
  return parts.join(' | ');
}

/**
 * Save an embedding to the database
 */
export async function saveTextEmbedding(
  content: string,
  sourceType: 'SubmissionEvent' | 'DiagnosisResult' | 'Problem',
  sourceId: string,
  model: string = 'text-embedding-3-small'
): Promise<void> {
  const embedding = await generateEmbedding(content, model);
  
  await prisma.textEmbedding.create({
    data: {
      content,
      embedding: embedding as any,
      embeddingModel: model,
      sourceType,
      sourceId
    }
  });
}
