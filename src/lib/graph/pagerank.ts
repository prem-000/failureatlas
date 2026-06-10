import { runQuery } from '@/lib/db/neo4j';
import { prisma } from '@/lib/db/prisma';

export interface WeaknessScore {
  id: string;
  name: string;
  pageRankScore: number;
  frequency: number;
  lastOccurrence: Date;
}

function calculateRecencyWeight(lastFailureDate: string): number {
  const lastDate = new Date(lastFailureDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastDate.getTime());
  const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Exponential decay with a 30-day half-life
  return Math.exp(-daysAgo / 30.0);
}

/**
 * Calculates PageRank scores for user systemic weaknesses based on failure frequency and recency weighting
 */
export async function computeWeaknessPageRank(
  userId: string,
  damping: number = 0.85,
  iterations: number = 100
): Promise<WeaknessScore[]> {
  // 1. Fetch user's failure occurrences and the root cause to weakness mappings
  // We need to trace: FailureEvent -> RootCause -> Weakness
  const failuresData = await runQuery<{
    failureId: string;
    timestamp: string;
    confidence: number;
    rcType: string;
    weaknessId: string;
    weaknessName: string;
  }>(
    `
    MATCH (f:FailureEvent {userId: $userId})-[rel_fr:SUGGESTS]->(r:RootCause)-[rel_rw:INDICATES]->(w:Weakness)
    RETURN f.eventId AS failureId, f.timestamp AS timestamp, rel_fr.confidence AS confidence, r.type AS rcType, w.id AS weaknessId, w.name AS weaknessName
    `,
    { userId }
  );

  if (failuresData.length === 0) {
    return [];
  }

  // 2. Group data to build the subgraph nodes and edges
  const weaknessNodes = new Set<string>();
  const weaknessNames = new Map<string, string>();
  
  // Maps weaknessId -> Array of { failureId, recencyWeight, confidence }
  const incomingLinks = new Map<string, { failureId: string; weight: number }[]>();
  const failureOutgoingCounts = new Map<string, number>();
  
  // Track frequency and last occurrence
  const frequencies = new Map<string, number>();
  const lastOccurrences = new Map<string, string>();

  for (const row of failuresData) {
    weaknessNodes.add(row.weaknessId);
    weaknessNames.set(row.weaknessId, row.weaknessName);
    
    // Track last occurrence
    const existingLast = lastOccurrences.get(row.weaknessId);
    if (!existingLast || new Date(row.timestamp) > new Date(existingLast)) {
      lastOccurrences.set(row.weaknessId, row.timestamp);
    }
    
    // Track frequency
    frequencies.set(row.weaknessId, (frequencies.get(row.weaknessId) ?? 0) + 1);

    const recencyWeight = calculateRecencyWeight(row.timestamp);
    const weight = row.confidence * recencyWeight;

    // Outgoing failures
    failureOutgoingCounts.set(row.failureId, (failureOutgoingCounts.get(row.failureId) ?? 0) + 1);

    if (!incomingLinks.has(row.weaknessId)) {
      incomingLinks.set(row.weaknessId, []);
    }
    incomingLinks.get(row.weaknessId)!.push({
      failureId: row.failureId,
      weight
    });
  }

  const weaknessArray = Array.from(weaknessNodes);
  const failureScores = new Map<string, number>();
  const uniqueFailures = Array.from(failureOutgoingCounts.keys());
  
  // Initialize PageRank scores
  const weaknessScores = new Map<string, number>();
  for (const w of weaknessArray) {
    weaknessScores.set(w, 1.0 / weaknessArray.length);
  }
  for (const f of uniqueFailures) {
    failureScores.set(f, 1.0 / uniqueFailures.length);
  }

  // 3. Power iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newWeaknessScores = new Map<string, number>();
    let maxDiff = 0;

    // Distribute rank from failures to weaknesses
    for (const w of weaknessArray) {
      let rankSum = 0.0;
      const links = incomingLinks.get(w) ?? [];
      
      for (const link of links) {
        const fScore = failureScores.get(link.failureId) ?? 0;
        const outCount = failureOutgoingCounts.get(link.failureId) ?? 1;
        rankSum += (fScore * link.weight) / outCount;
      }

      const newScore = (1 - damping) / weaknessArray.length + damping * rankSum;
      const prevScore = weaknessScores.get(w) ?? 0;
      maxDiff = Math.max(maxDiff, Math.abs(newScore - prevScore));
      newWeaknessScores.set(w, newScore);
    }

    // Update weakness scores
    for (const [w, score] of newWeaknessScores.entries()) {
      weaknessScores.set(w, score);
    }

    // Distribute rank from weaknesses back to failures (bipartite style)
    const newFailureScores = new Map<string, number>();
    for (const f of uniqueFailures) {
      let rankSum = 0.0;
      
      // Find all weaknesses this failure points to
      for (const w of weaknessArray) {
        const links = incomingLinks.get(w) ?? [];
        const hasLink = links.some(l => l.failureId === f);
        
        if (hasLink) {
          const wScore = weaknessScores.get(w) ?? 0;
          rankSum += wScore; // simplified feedback loop
        }
      }

      newFailureScores.set(f, (1 - damping) / uniqueFailures.length + damping * rankSum);
    }

    for (const [f, score] of newFailureScores.entries()) {
      failureScores.set(f, score);
    }

    // Check convergence
    if (maxDiff < 1e-6) {
      break;
    }
  }

  // 4. Update the PostgreSQL relational database and return mapped list
  const results: WeaknessScore[] = [];
  
  for (const w of weaknessArray) {
    const prScore = weaknessScores.get(w) ?? 0;
    const freq = frequencies.get(w) ?? 0;
    const lastOccStr = lastOccurrences.get(w) ?? new Date().toISOString();
    const lastOcc = new Date(lastOccStr);
    
    // Update Prisma systemic weakness node
    await prisma.systemicWeakness.upsert({
      where: { name: w },
      update: {
        pageRankScore: prScore,
        frequency: freq,
        lastOccurrence: lastOcc
      },
      create: {
        name: w,
        type: w,
        severity: 'high',
        confidence: 0.8,
        pageRankScore: prScore,
        frequency: freq,
        lastOccurrence: lastOcc
      }
    });

    results.push({
      id: w,
      name: weaknessNames.get(w) ?? w,
      pageRankScore: prScore,
      frequency: freq,
      lastOccurrence: lastOcc
    });
  }

  return results.sort((a, b) => b.pageRankScore - a.pageRankScore);
}
