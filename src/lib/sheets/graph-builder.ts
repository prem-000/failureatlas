import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';
import dagre from 'dagre';
import type { PracticeSheet, SheetLevel, SheetProblem } from '@/types/sheets';
import type { RoadmapNodeData } from '@/hooks/usePhase3Queries';
import type { NodeState } from '@/app/graph/components/RoadmapNode';

export interface UserProblemProgress {
  hasAccepted: boolean;
  attempts: number;
  lastStatus?: string;
}

export function buildGraphFromSheet(params: {
  sheet: PracticeSheet;
  levelIdx: number;
  userProgressMap: Map<string, UserProblemProgress>;
  searchQuery?: string;
  isMobile?: boolean;
}): { nodes: Node[]; edges: Edge[] } {
  const { sheet, levelIdx, userProgressMap, searchQuery = '', isMobile = false } = params;

  if (!sheet || !sheet.levels || sheet.levels.length === 0) {
    return { nodes: [], edges: [] };
  }

  const levelIndex = Math.max(0, Math.min(levelIdx, sheet.levels.length - 1));
  const currentLevel: SheetLevel = sheet.levels[levelIndex];
  if (!currentLevel) {
    return { nodes: [], edges: [] };
  }

  // Level 1 is always available; Level N is available if all problems in Level N-1 are accepted
  let isLevelAvailable = true;
  if (levelIndex > 0) {
    const prevLevel = sheet.levels[levelIndex - 1];
    isLevelAvailable = prevLevel.problems.every((p) => {
      const prog = userProgressMap.get(p.slug.toLowerCase()) || userProgressMap.get(String(p.leetcodeId));
      return prog?.hasAccepted === true;
    });
  }

  const hasSearch = !!searchQuery.trim();
  const query = searchQuery.toLowerCase();

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 100, nodesep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const mainCluster = currentLevel.label;
  const remCluster = 'REMEDIATION';

  g.setNode(`cluster-${mainCluster}`, { label: mainCluster, width: 340, height: 200 });

  const hasRemediation = Array.isArray(currentLevel.remediation) && currentLevel.remediation.length > 0;
  if (hasRemediation) {
    g.setNode(`cluster-${remCluster}`, { label: remCluster, width: 340, height: 200 });
  }

  currentLevel.problems.forEach((p) => {
    g.setNode(p.slug, { width: 300, height: 140 });
    g.setParent(p.slug, `cluster-${mainCluster}`);
  });

  if (hasRemediation) {
    currentLevel.remediation!.forEach((p) => {
      g.setNode(p.slug, { width: 300, height: 140 });
      g.setParent(p.slug, `cluster-${remCluster}`);
    });
  }

  const edgesData: Array<{
    source: string;
    target: string;
    type: string;
    confidence?: number;
    reason?: string;
  }> = [];

  for (let i = 0; i < currentLevel.problems.length - 1; i++) {
    edgesData.push({
      source: currentLevel.problems[i].slug,
      target: currentLevel.problems[i + 1].slug,
      type: 'mastery_path',
      confidence: 0.95,
      reason: 'Sequential Core Progression',
    });
    g.setEdge(currentLevel.problems[i].slug, currentLevel.problems[i + 1].slug);
  }

  if (hasRemediation) {
    currentLevel.remediation!.forEach((rem, idx) => {
      const sourceProblem = currentLevel.problems[Math.min(idx, currentLevel.problems.length - 1)];
      edgesData.push({
        source: sourceProblem.slug,
        target: rem.slug,
        type: 'remediation',
        confidence: 0.9,
        reason: 'Targeted Remediation',
      });
      g.setEdge(sourceProblem.slug, rem.slug);
    });
  }

  dagre.layout(g);

  const reactFlowNodes: Node[] = [];

  const mapProblemToNode = (p: SheetProblem, cluster: string): Node => {
    const dagreNode = g.node(p.slug);
    const prog = userProgressMap.get(p.slug.toLowerCase()) || userProgressMap.get(String(p.leetcodeId));

    let nodeState: NodeState = 'locked';
    if (prog?.hasAccepted) {
      nodeState = 'solved';
    } else if (prog && prog.attempts > 0) {
      nodeState = 'failed';
    } else if (isLevelAvailable) {
      nodeState = 'available';
    } else {
      nodeState = 'locked';
    }

    const matchesSearch = hasSearch && (
      p.title.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query) ||
      p.topics.some(t => t.toLowerCase().includes(query)) ||
      p.patterns.some(t => t.toLowerCase().includes(query))
    );

    const roadmapData: RoadmapNodeData = {
      leetcodeId: p.leetcodeId,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      topics: p.topics,
      patterns: p.patterns,
      reason: p.whyThisProblem,
      cluster,
      nodeState,
      userAttempts: prog?.attempts || 0,
      userStatus: prog?.lastStatus || (nodeState === 'solved' ? 'Accepted' : undefined),
    };

    return {
      id: p.slug,
      type: 'roadmapNode',
      position: { x: (dagreNode?.x || 0) - 150, y: (dagreNode?.y || 0) - 70 },
      data: {
        ...roadmapData,
        isFaded: hasSearch && !matchesSearch,
        isHighlighted: hasSearch && matchesSearch,
      },
    };
  };

  currentLevel.problems.forEach((p) => {
    reactFlowNodes.push(mapProblemToNode(p, mainCluster));
  });

  if (hasRemediation) {
    currentLevel.remediation!.forEach((p) => {
      reactFlowNodes.push(mapProblemToNode(p, remCluster));
    });
  }

  const clustersToRender = [mainCluster];
  if (hasRemediation) clustersToRender.push(remCluster);

  clustersToRender.forEach((c) => {
    const dagreGroup = g.node(`cluster-${c}`);
    if (dagreGroup) {
      reactFlowNodes.push({
        id: `cluster-${c}`,
        type: 'clusterHeader',
        position: { x: dagreGroup.x - 150, y: dagreGroup.y - dagreGroup.height / 2 - 30 },
        data: { label: c },
      });
    }
  });

  const reactFlowEdges: Edge[] = edgesData.map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    type: isMobile ? 'straight' : 'smart',
    data: {
      type: e.type,
      confidence: e.confidence,
      reason: e.reason,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: e.type === 'mastery_path' ? '#60a5fa' : e.type === 'remediation' ? '#fb923c' : '#9ca3af',
    },
  }));

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}
