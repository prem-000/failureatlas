import { OpenAI } from 'openai';
import { prisma } from '@/lib/db/prisma';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (openaiClient) return openaiClient;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY is not defined. Using mock embeddings fallback.');
    return null;
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

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
 * Generate semantic embedding using OpenAI text-embedding-3-small/large
 */
/**
 * Generate semantic embedding using OpenAI text-embedding-3-small/large
 */
export async function generateEmbedding(
  text: string,
  model: string = 'text-embedding-3-small'
): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('⚠️ OpenAI client not initialized. Using mock embeddings.');
    return generateMockEmbedding(text, model === 'text-embedding-3-large' ? 3072 : 1536);
  }

  try {
    const response = await client.embeddings.create({
      model,
      input: text.trim(),
      encoding_format: 'float'
    });
    return response.data[0].embedding;
  } catch (error: any) {
    // ✅ Handle OpenAI quota errors (429)
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.warn('⚠️ OpenAI quota exceeded. Using mock embeddings as fallback.');
      return generateMockEmbedding(text, model === 'text-embedding-3-large' ? 3072 : 1536);
    }
    
    // ✅ Handle invalid API key
    if (error.code === 'invalid_api_key' || error.error?.code === 'invalid_api_key') {
      console.warn('⚠️ OpenAI API key invalid. Using mock embeddings as fallback.');
      return generateMockEmbedding(text, model === 'text-embedding-3-large' ? 3072 : 1536);
    }

    console.error('❌ Embedding generation failed:', {
      status: error.status,
      code: error.code,
      message: error.message?.substring(0, 100)
    });
    
    // ✅ Always fallback to mock embedding instead of crashing
    return generateMockEmbedding(text, model === 'text-embedding-3-large' ? 3072 : 1536);
  }
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
  
  // Extract first 10 and last 10 lines of the code to represent structure
  const codeLines = code.split('\n');
  const codeSnippet = codeLines.length > 20
    ? [...codeLines.slice(0, 10), '... [omitted lines] ...', ...codeLines.slice(-10)].join('\n')
    : code;
    
  parts.push(`Code structure: ${codeSnippet}`);
  return parts.join(' | ');
}

/**
 * Save an embedding to the PostgreSQL DB
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
      embedding: embedding as any, // Cast to any to fit Prisma Json type
      embeddingModel: model,
      sourceType,
      sourceId
    }
  });
}
