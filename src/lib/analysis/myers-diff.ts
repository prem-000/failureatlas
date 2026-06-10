export interface EditOperation {
  type: 'INSERT' | 'DELETE' | 'EQUAL';
  lineIndex: number;
  content: string;
}

/**
 * Myers' O(ND) algorithm for computing minimum edit distance
 * with actual edit sequence reconstruction
 */
export function myersDiff(oldCode: string, newCode: string): EditOperation[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  
  const N = oldLines.length;
  const M = newLines.length;
  const maxD = N + M;

  // Forward trace
  const trace: { [key: number]: number }[] = [];
  const V: { [key: number]: number } = {};
  V[1] = 0;

  let x = 0;
  let y = 0;
  let found = false;

  for (let d = 0; d <= maxD; d++) {
    trace.push({ ...V });
    for (let k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && (V[k - 1] ?? -1) < (V[k + 1] ?? -1))) {
        x = V[k + 1] ?? 0;
      } else {
        x = (V[k - 1] ?? 0) + 1;
      }
      
      y = x - k;

      // Extend diagonal
      while (x < N && y < M && oldLines[x] === newLines[y]) {
        x++;
        y++;
      }
      
      V[k] = x;

      if (x >= N && y >= M) {
        found = true;
        break;
      }
    }
    if (found) {
      break;
    }
  }

  // Reconstruct path
  const operations: EditOperation[] = [];
  x = N;
  y = M;

  for (let d = trace.length - 1; d > 0; d--) {
    const currentV = trace[d];
    const k = x - y;
    let prevK = 0;

    if (k === -d || (k !== d && (currentV[k - 1] ?? -1) < (currentV[k + 1] ?? -1))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = currentV[prevK] ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      x--;
      y--;
      operations.push({
        type: 'EQUAL',
        lineIndex: x,
        content: oldLines[x],
      });
    }

    if (d > 0) {
      if (x === prevX) {
        y--;
        operations.push({
          type: 'INSERT',
          lineIndex: y,
          content: newLines[y],
        });
      } else {
        x--;
        operations.push({
          type: 'DELETE',
          lineIndex: x,
          content: oldLines[x],
        });
      }
    }
  }

  while (x > 0 && y > 0) {
    x--;
    y--;
    operations.push({
      type: 'EQUAL',
      lineIndex: x,
      content: oldLines[x],
    });
  }
  while (y > 0) {
    y--;
    operations.push({
      type: 'INSERT',
      lineIndex: y,
      content: newLines[y],
    });
  }
  while (x > 0) {
    x--;
    operations.push({
      type: 'DELETE',
      lineIndex: x,
      content: oldLines[x],
    });
  }

  return operations.reverse();
}

/**
 * Confidence based on edit distance and type of changes
 */
export function computeDiffConfidence(operations: EditOperation[]): number {
  const edits = operations.filter(op => op.type !== 'EQUAL');
  const totalEdits = edits.length;
  if (totalEdits === 0) return 0.0;

  const boundaryKeywords = [
    '<', '<=', '>', '>=', '==', '!=', '+ 1', '- 1', '+1', '-1', 'length', 'size', 'null', 'undefined', '0', '-1'
  ];

  let boundaryChangesCount = 0;
  for (const op of edits) {
    const content = op.content.trim();
    const isBoundary = boundaryKeywords.some(kw => content.includes(kw));
    if (isBoundary) {
      boundaryChangesCount++;
    }
  }

  const boundaryRatio = boundaryChangesCount / totalEdits;
  const baseConfidence = 1.0 / (1.0 + totalEdits * 0.05);

  return Math.min(0.99, Math.max(0.05, baseConfidence + boundaryRatio * 0.4));
}
