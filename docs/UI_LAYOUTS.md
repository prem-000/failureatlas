# Praxis Frontend UI & Layout Specification

## Overview

Praxis is a high-fidelity diagnostic platform that moves beyond *what failed* to decode *why it failed*. By leveraging Knowledge Graph inference and RAG-driven analysis, it pinpoints systemic weaknesses in software engineering patterns, specifically optimized for high-scale environments and algorithmic performance.

## 🚀 Vision

Engineered for entropy, Praxis decodes systemic complexity using knowledge-graph inference to pinpoint the exact root cause of high-scale engineering failures. It transforms raw failure logs into actionable intelligence through:

- **Root Cause Inference**: AI-driven probabilistic modeling that separates symptoms from genuine systemic triggers
- **Knowledge Graph Visualization**: A living, evolving map of the entire dependency architecture  
- **RAG Diagnosis**: Retrieval-Augmented Generation that cross-references failure logs with internal documentation for transparent reasoning

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **UI Logic**: React 19 with TypeScript
- **Styling**: Tailwind CSS with CSS Variables
- **Graph Engine**: React Flow for DAG Visualization
- **AI/LLM**: Retrieval-Augmented Generation (RAG) with transparency evidence panels
- **State Management**: Relational Graph stored in PostgreSQL (traversed with Prisma ORM)
- **Typography**: Geist Sans font family
- **Icons**: Heroicons and Lucide React

## 🎨 Design System: "Learning Intelligence System"

The UI is built on a custom design system optimized for high-density information and technical legibility.

### Theme Configuration
- **Mandatory Dark Mode**: #131313 surface background
- **High-elevation surfaces**: 0.5px border treatments, 12px border-radius
- **Zero-gradient flat design**: Clean, technical aesthetic

### Color Tokens

```css
:root {
  /* Dark mode (mandatory) */
  --color-background: 19 19 19;        /* #131313 */
  --color-surface: 25 25 25;           /* Elevated surfaces */
  --color-foreground: 248 250 252;
  --color-muted: 39 39 42;             /* Zinc-800 */
  --color-muted-foreground: 161 161 170;
  --color-border: 63 63 70;            /* Zinc-700 */
  
  /* Brand colors */
  --color-primary: 255 95 82;          /* Brand Coral #ff5f52 */
  --color-primary-foreground: 255 255 255;
  
  /* Semantic node colors */
  --color-problem: 59 130 246;         /* Blue */
  --color-failure: 251 146 60;         /* Coral */
  --color-root-cause: 245 158 11;      /* Amber */
  --color-weakness: 168 85 247;        /* Purple */
  --color-strategy: 34 197 94;         /* Green */
  
  /* Status colors */
  --color-success: 34 197 94;
  --color-warning: 245 158 11;
  --color-error: 239 68 68;
  --color-critical: 255 95 82;         /* Brand Coral for critical states */
}

/* Surface elevation system */
.surface-elevated {
  background-color: rgb(var(--color-surface));
  border: 0.5px solid rgb(var(--color-border));
}
```

### Typography Scale (Geist Sans)

```css
.text-body { 
  font-family: 'Geist Sans', system-ui, sans-serif;
  font-size: 14px; 
  line-height: 20px; 
}
.text-caption { 
  font-family: 'Geist Sans', system-ui, sans-serif;
  font-size: 12px; 
  line-height: 16px; 
}
.text-micro { 
  font-family: 'Geist Sans', system-ui, sans-serif;
  font-size: 11px; 
  line-height: 14px; 
}
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
```

### Card System

```css
.card {
  @apply bg-surface surface-elevated;
  border-radius: 12px;
  padding: 16px; /* Consistent internal padding */
}

.card-dense {
  @apply card;
  padding: 12px; /* For high-density data displays */
}

/* High-density card components with internal gutter */
.data-card {
  @apply card-dense;
  display: flex;
  flex-direction: column;
  gap: 8px; /* Internal 8px gutter system */
}
```
## 📐 Layout Architecture

Praxis utilizes specialized layout patterns to manage complex diagnostic data:

### Split-Pane RAG Interface
The Diagnosis page uses a vertically stacked split-pane (60/40) allowing the user to maintain context of the AI conversation while reviewing retrieved evidence cards.

### Data-Rich Vertical Feeds  
The Dashboard and Problem Tracker utilize high-density card components with consistent 16px padding and internal 8px gutter systems for structured data display.

### Full-Canvas Interaction
The Graph Explorer implements a full-bleed React Flow viewport, prioritizing spatial exploration with overlayed minimaps and bottom-sheet drawers for node details.

## ✨ Motion & Interactivity

Movement in Praxis is functional, designed to guide the engineer's focus during high-stakes diagnostics:

### Root Cause Pulse
Root cause nodes (Amber) and critical alerts feature a subtle 2s ease-in-out box-shadow pulse in Brand Coral to draw immediate attention to the inferred Practice Trackingger.

```css
@keyframes root-cause-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 95, 82, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(255, 95, 82, 0.1); }
}

.root-cause-critical {
  animation: root-cause-pulse 2s ease-in-out infinite;
}
```

### Myers Diff Reveal
Expanding a problem card triggers a smooth max-height transition and vertical slide-down to reveal the code diff, mirroring the logical flow of "opening" a file.

### RAG Evidence Streaming
Evidence cards in the Diagnosis panel utilize staggered entrance animations (fade-in + 10px translateY) to visualize the real-time retrieval process of the RAG engine.

### Node Detail Transitions
The Detail Drawer and Filter Sidebars use spring-based slide-in animations (300ms, overshoot 1.1) to maintain spatial awareness within the knowledge graph.

## 📱 Core User Journey & Page Layouts

### Landing Page (/) - High-Impact Value Proposition

**Layout Structure**: Full-width hero layout with minimal navigation

**Design Focus**: High-impact "Why did it fail?" value proposition using immersive dark theme

**Components**:

#### TopAppBar (Global Navigation)
```typescript
interface TopAppBarProps {
  title?: string;
  showBackButton?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

const TopAppBar: React.FC<TopAppBarProps> = ({ 
  title, 
  showBackButton, 
  actions,
  className 
}) => (
  <header className={cn(
    "sticky top-0 z-50 surface-elevated backdrop-blur-sm",
    "flex items-center justify-between px-6 py-4 min-h-[64px]",
    className
  )}>
    <div className="flex items-center space-x-4">
      {showBackButton && (
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}
      <div className="flex items-center space-x-2">
        <Logo className="w-8 h-8" />
        <span className="text-xl font-semibold">Praxis</span>
        {title && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-lg font-medium">{title}</span>
          </>
        )}
      </div>
    </div>
    <div className="flex items-center space-x-3">
      {actions}
      <Button variant="ghost" size="sm">Sign In</Button>
      <Button size="sm" className="bg-primary hover:bg-primary/90">
        Get Started
      </Button>
    </div>
  </header>
);
```

#### HeroSection
```typescript
const HeroSection: React.FC = () => (
  <section className="px-6 py-24 text-center bg-background">
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 inline-flex items-center space-x-2 px-4 py-2 bg-surface surface-elevated rounded-full">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-caption font-medium">AI-Powered Learning Intelligence</span>
      </div>
      
      <h1 className="text-6xl font-bold mb-6 leading-tight">
        Most platforms answer{" "}
        <span className="text-muted-foreground">what happened.</span>
        <br />
        Praxis answers{" "}
        <span className="text-primary">why did it fail.</span>
      </h1>
      
      <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
        Engineered for entropy, Praxis decodes systemic complexity using 
        knowledge-graph inference to pinpoint the exact root cause of high-scale 
        engineering failures.
      </p>
      
      <div className="flex items-center justify-center space-x-6">
        <Button size="lg" className="px-10 py-4 bg-primary hover:bg-primary/90 text-lg">
          <Brain className="w-5 h-5 mr-2" />
          Start Analysis
        </Button>
        <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
          <Play className="w-5 h-5 mr-2" />
          View Demo
        </Button>
      </div>
    </div>
  </section>
);
```

#### FeatureHighlights
```typescript
interface DiagnosticFeature {
  title: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  metrics?: string;
}

const diagnosticFeatures: DiagnosticFeature[] = [
  {
    title: "Root Cause Inference",
    description: "AI-driven probabilistic modeling that separates symptoms from genuine systemic triggers",
    icon: MagnifyingGlassIcon,
    color: "text-amber-400",
    metrics: "91% accuracy"
  },
  {
    title: "Knowledge Graph Visualization", 
    description: "A living, evolving map of the entire dependency architecture",
    icon: ShareIcon,
    color: "text-purple-400",
    metrics: "Real-time updates"
  },
  {
    title: "RAG Diagnosis",
    description: "Retrieval-Augmented Generation with transparent evidence sourcing",
    icon: ChatBubbleLeftRightIcon,
    color: "text-primary",
    metrics: "Full transparency"
  },
  {
    title: "High-Scale Optimization",
    description: "Specifically engineered for enterprise-grade failure analysis",
    icon: BoltIcon,
    color: "text-green-400",
    metrics: "Enterprise ready"
  }
];

const FeatureHighlights: React.FC = () => (
  <section className="px-6 py-24 bg-surface/50">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Intelligence Beyond Logs</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform raw failure data into actionable engineering intelligence
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {diagnosticFeatures.map((feature, index) => (
          <DiagnosticFeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  </section>
);

const DiagnosticFeatureCard: React.FC<DiagnosticFeature> = ({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  metrics 
}) => (
  <div className="card group hover:surface-elevated transition-all duration-300">
    <div className="flex items-start space-x-4">
      <div className={cn(
        "p-3 rounded-lg bg-surface surface-elevated group-hover:scale-110 transition-transform",
        color
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-caption text-muted-foreground mb-3">{description}</p>
        {metrics && (
          <span className="text-micro font-medium text-primary">{metrics}</span>
        )}
      </div>
    </div>
  </div>
);
```

**Data Fetching**: None (static content)
**Loading States**: None required
**Animations**: Smooth scroll to sections, button hover effects
### Dashboard Page (/dashboard) - Real-Time Intelligence Hub

**Layout Structure**: Scrolling dashboard layout with Real-time Risk Index, Logic Maps, and Critical Weakness summaries

**Design Focus**: High-density information display with authenticated navigation

**Data Fetching**:
```typescript
const useDashboardData = () => {
  const { data: weaknesses } = useQuery({
    queryKey: ['weaknesses', 'top-3'],
    queryFn: () => api.graph.getWeaknesses({ limit: 3, timeframe: 'month' })
  });

  const { data: recentFailures } = useQuery({
    queryKey: ['failures', 'recent'],
    queryFn: () => api.submissions.getRecent({ days: 7 })
  });

  const { data: riskPrediction } = useQuery({
    queryKey: ['risk', 'next-problem'],
    queryFn: () => api.predictions.getNextProblemRisk()
  });

  return { weaknesses, recentFailures, riskPrediction };
};
```

#### NavigationDrawer (Authenticated Layout)
```typescript
interface NavigationDrawerProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isActive?: boolean;
}

const navigationItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { label: 'Graph Explorer', href: '/graph', icon: ShareIcon },
  { label: 'AI Diagnosis', href: '/diagnosis', icon: ChatBubbleLeftRightIcon },
  { label: 'Problem Tracker', href: '/problems', icon: DocumentTextIcon },
  { label: 'Settings', href: '/settings', icon: CogIcon }
];

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ 
  isOpen = true, 
  onToggle 
}) => (
  <aside className={cn(
    "surface-elevated border-r border-border transition-all duration-300",
    isOpen ? "w-64" : "w-16"
  )}>
    <div className="p-6 border-b border-border">
      <div className="flex items-center space-x-3">
        <Logo className="w-8 h-8 flex-shrink-0" />
        {isOpen && (
          <div>
            <span className="font-semibold text-lg">Praxis</span>
            <p className="text-caption text-muted-foreground">Intelligence System</p>
          </div>
        )}
      </div>
    </div>
    
    <nav className="p-4 space-y-2">
      {navigationItems.map((item) => (
        <NavigationItem key={item.href} item={item} isCollapsed={!isOpen} />
      ))}
    </nav>
    
    <div className="absolute bottom-4 left-4 right-4">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onToggle}
        className="w-full justify-center"
      >
        <PanelLeftClose className="w-4 h-4" />
      </Button>
    </div>
  </aside>
);
```

#### CriticalWeaknessCard (High-Density Data Display)
```typescript
interface CriticalWeaknessCardProps {
  weaknesses: SystemicWeakness[];
  isLoading?: boolean;
}

interface SystemicWeakness {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  frequency: number;
  lastOccurrence: Date;
  riskIndex: number;
}

const CriticalWeaknessCard: React.FC<CriticalWeaknessCardProps> = ({ 
  weaknesses, 
  isLoading 
}) => (
  <div className="data-card">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Growth Opportunities</h3>
      </div>
      <Button variant="ghost" size="sm" className="text-caption">
        View Logic Map
      </Button>
    </div>
    
    {isLoading ? (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <SystemicWeaknessSkeleton key={i} />)}
      </div>
    ) : weaknesses?.length > 0 ? (
      <div className="space-y-3">
        {weaknesses.map((weakness) => (
          <SystemicWeaknessItem key={weakness.id} weakness={weakness} />
        ))}
      </div>
    ) : (
      <EmptyState 
        icon={CheckCircle}
        message="No critical weaknesses detected"
        description="System analysis shows stable patterns"
      />
    )}
  </div>
);

const SystemicWeaknessItem: React.FC<{ weakness: SystemicWeakness }> = ({ 
  weakness 
}) => (
  <div className={cn(
    "p-3 rounded-lg surface-elevated hover:bg-surface/80 transition-colors cursor-pointer",
    weakness.severity === 'critical' && "root-cause-critical"
  )}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm">{weakness.name}</span>
          <SeverityBadge severity={weakness.severity} />
        </div>
        <div className="flex items-center space-x-4 text-caption text-muted-foreground">
          <span>Risk Index: {weakness.riskIndex}%</span>
          <span>•</span>
          <span>{weakness.frequency}x occurrences</span>
        </div>
      </div>
      <RiskIndexMeter value={weakness.confidence} size={32} />
    </div>
    
    <SystemicConfidenceBar 
      confidence={weakness.confidence}
      severity={weakness.severity}
    />
  </div>
);
```
#### RecentFailuresFeed (Vertical Data Feed)
```typescript
interface RecentFailuresFeedProps {
  failures: FailureEvent[];
  isLoading?: boolean;
}

const RecentFailuresFeed: React.FC<RecentFailuresFeedProps> = ({ 
  failures, 
  isLoading 
}) => (
  <div className="data-card">
    <div className="flex items-center space-x-2 mb-4">
      <ExclamationTriangleIcon className="w-5 h-5 text-failure" />
      <h3 className="text-lg font-semibold">Recent Practice Sessions</h3>
      <span className="text-caption text-muted-foreground">(Last 7 Days)</span>
    </div>
    
    {isLoading ? (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => <FailureEventSkeleton key={i} />)}
      </div>
    ) : failures?.length > 0 ? (
      <div className="space-y-2 max-h-80 overflow-auto">
        {failures.map((failure) => (
          <FailureEventCard key={failure.id} failure={failure} />
        ))}
      </div>
    ) : (
      <EmptyState 
        icon={CheckCircle}
        message="No recent failures"
        description="System stability maintained"
      />
    )}
  </div>
);

const FailureEventCard: React.FC<{ failure: FailureEvent }> = ({ failure }) => (
  <div className="p-3 rounded-lg surface-elevated hover:bg-surface/80 transition-colors cursor-pointer">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm truncate">{failure.problemTitle}</span>
          <TechnicalDifficultyBadge difficulty={failure.problemDifficulty} />
        </div>
        
        <div className="flex items-center space-x-2 text-caption text-muted-foreground mb-2">
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(failure.timestamp)} ago</span>
          <span>•</span>
          <span>{failure.attemptNumber} attempts</span>
        </div>
        
        {failure.analysis?.rootCause && (
          <div className="flex items-center space-x-2">
            <RootCauseBadge 
              rootCause={failure.analysis.rootCause}
              confidence={failure.analysis.confidence}
            />
          </div>
        )}
      </div>
      
      <div className="flex-shrink-0 ml-3">
        <ConfidenceIndicator confidence={failure.analysis?.confidence || 0} />
      </div>
    </div>
  </div>
);
```

#### FailureRiskWidget
```typescript
interface FailureRiskWidgetProps {
  prediction?: RiskPrediction;
  isLoading?: boolean;
}

const FailureRiskWidget: React.FC<FailureRiskWidgetProps> = ({ 
  prediction, 
  isLoading 
}) => (
  <div className="card p-6">
    <h3 className="text-lg font-semibold mb-4">Failure Risk Prediction</h3>
    
    {isLoading ? (
      <RiskWidgetSkeleton />
    ) : prediction ? (
      <div className="text-center">
        <CircularProgress 
          value={prediction.riskPercentage}
          size={120}
          strokeWidth={8}
          className="mb-4"
        />
        <div className="space-y-2">
          <p className="font-medium">{prediction.problemTitle}</p>
          <p className="text-sm text-muted-foreground">
            {prediction.riskPercentage}% predicted failure risk
          </p>
          <p className="text-caption text-muted-foreground">
            Based on: {prediction.reasoning}
          </p>
          <Button size="sm" variant="outline" className="mt-3">
            Try This Problem
          </Button>
        </div>
      </div>
    ) : (
      <EmptyState message="No risk prediction available" />
    )}
  </div>
);
```

#### MiniKnowledgeGraph
```typescript
interface MiniKnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isLoading?: boolean;
}

const MiniKnowledgeGraph: React.FC<MiniKnowledgeGraphProps> = ({ 
  nodes, 
  edges, 
  isLoading 
}) => (
  <div className="card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">Knowledge Graph</h3>
      <Button variant="ghost" size="sm">Explore Full Graph</Button>
    </div>
    
    <div className="h-64 bg-muted rounded-lg">
      {isLoading ? (
        <GraphSkeleton />
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={miniNodeTypes}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          zoomOnScroll={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
        </ReactFlow>
      )}
    </div>
  </div>
);
```

**Loading States**: Skeleton components for each widget
**Error States**: Individual error boundaries per widget
**Empty States**: Custom messages for each data type
### Graph Explorer Page (/graph) - Full-Canvas Interaction

**Layout Structure**: Full-bleed React Flow viewport with overlayed minimaps and bottom-sheet drawers for node details

**Design Focus**: Interactive React Flow canvas for tracing node relationships and event chains

**Data Fetching**:
```typescript
const useGraphData = () => {
  const [filters, setFilters] = useState<GraphFilters>({
    topics: [],
    rootCauseTypes: [],
    dateRange: { start: null, end: null },
    confidenceThreshold: 0.5
  });

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', 'full', filters],
    queryFn: () => api.graph.getFullGraph(filters),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  return { graphData, filters, setFilters, isLoading };
};
```

#### GraphExplorerLayout
```typescript
const GraphExplorerLayout: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(true);
  const { graphData, filters, setFilters } = useGraphData();

  return (
    <div className="flex h-full">
      <GraphFilterSidebar 
        isOpen={isFilterSidebarOpen}
        onToggle={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <div className="flex-1 relative">
        <GraphCanvas 
          nodes={graphData?.nodes || []}
          edges={graphData?.edges || []}
          onNodeClick={setSelectedNode}
        />
        
        <GraphControls className="absolute top-4 left-4" />
        <GraphMinimap className="absolute bottom-4 right-4" />
        <GraphSearchBar className="absolute top-4 right-4" />
      </div>

      <NodeDetailDrawer 
        node={selectedNode}
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
};
```

#### GraphFilterSidebar
```typescript
interface GraphFilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: GraphFilters;
  onFiltersChange: (filters: GraphFilters) => void;
}

const GraphFilterSidebar: React.FC<GraphFilterSidebarProps> = ({
  isOpen,
  onToggle,
  filters,
  onFiltersChange
}) => (
  <aside className={cn(
    "bg-background border-r transition-all duration-200",
    isOpen ? "w-80" : "w-0 overflow-hidden"
  )}>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        <Button variant="ghost" size="sm" onClick={onToggle}>
          <ChevronLeftIcon className="w-4 h-4" />
        </Button>
      </div>

      <FilterSection title="Topics">
        <TopicFilter 
          selected={filters.topics}
          onChange={(topics) => onFiltersChange({ ...filters, topics })}
        />
      </FilterSection>

      <FilterSection title="Root Cause Types">
        <RootCauseTypeFilter 
          selected={filters.rootCauseTypes}
          onChange={(types) => onFiltersChange({ ...filters, rootCauseTypes: types })}
        />
      </FilterSection>

      <FilterSection title="Date Range">
        <DateRangeFilter 
          range={filters.dateRange}
          onChange={(dateRange) => onFiltersChange({ ...filters, dateRange })}
        />
      </FilterSection>

      <FilterSection title="Confidence Threshold">
        <ConfidenceSlider 
          value={filters.confidenceThreshold}
          onChange={(threshold) => onFiltersChange({ ...filters, confidenceThreshold: threshold })}
        />
      </FilterSection>
    </div>
  </aside>
);
```

#### GraphCanvas
```typescript
interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (node: GraphNode) => void;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges, onNodeClick }) => {
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onNodesChange = useCallback((changes) => {
    // Handle node position changes
  }, []);

  const onNodeClickHandler = useCallback((event, node) => {
    onNodeClick(node.data as GraphNode);
  }, [onNodeClick]);

  return (
    <ReactFlow
      nodes={nodes.map(transformToReactFlowNode)}
      edges={edges.map(transformToReactFlowEdge)}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClickHandler}
      nodeTypes={customNodeTypes}
      edgeTypes={customEdgeTypes}
      fitView
      attributionPosition="bottom-left"
    >
      <Background />
      <Controls />
      <MiniMap 
        nodeStrokeColor={(n) => getNodeColor(n.type)}
        nodeColor={(n) => getNodeColor(n.type)}
        nodeBorderRadius={8}
        className="!bg-background !border"
      />
    </ReactFlow>
  );
};
```
#### NodeDetailDrawer
```typescript
interface NodeDetailDrawerProps {
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
}

const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({ 
  node, 
  isOpen, 
  onClose 
}) => (
  <Sheet open={isOpen} onOpenChange={onClose}>
    <SheetContent side="right" className="w-96">
      {node && (
        <>
          <SheetHeader>
            <div className="flex items-center space-x-2">
              <NodeTypeIcon type={node.type} />
              <div>
                <SheetTitle>{node.name}</SheetTitle>
                <SheetDescription>{node.type}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <div className="py-6 space-y-6">
            <NodeProperties node={node} />
            <NodeRelationships nodeId={node.id} />
            <NodeInsights node={node} />
          </div>
        </>
      )}
    </SheetContent>
  </Sheet>
);

const NodeRelationships: React.FC<{ nodeId: string }> = ({ nodeId }) => {
  const { data: relationships } = useQuery({
    queryKey: ['node-relationships', nodeId],
    queryFn: () => api.graph.getNodeRelationships(nodeId)
  });

  return (
    <div>
      <h4 className="font-medium mb-3">Connected Nodes</h4>
      <div className="space-y-2">
        {relationships?.map((rel) => (
          <RelationshipItem key={rel.id} relationship={rel} />
        ))}
      </div>
    </div>
  );
};
```

### AI Diagnosis Page (/diagnosis) - Split-Pane RAG Interface

**Layout Structure**: Vertically stacked split-pane (60/40) maintaining context of AI conversation while reviewing retrieved evidence cards  

**Design Focus**: Split-pane chat interface with a live "Evidence Panel" for RAG transparency

**Data Fetching**:
```typescript
const useDiagnosisData = () => {
  const [messages, setMessages] = useState<DiagnosisMessage[]>([]);
  const [currentEvidence, setCurrentEvidence] = useState<Evidence[]>([]);

  const { mutate: askQuestion, isLoading } = useMutation({
    mutationFn: (question: string) => api.diagnosis.ask(question),
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev,
        { type: 'user', content: question },
        { type: 'assistant', content: response.answer, evidence: response.evidence }
      ]);
      setCurrentEvidence(response.evidence);
    }
  });

  return { messages, askQuestion, isLoading, currentEvidence };
};
```

#### DiagnosisLayout
```typescript
const DiagnosisLayout: React.FC = () => {
  const { messages, askQuestion, isLoading, currentEvidence } = useDiagnosisData();

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <ChatHeader />
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput onSendMessage={askQuestion} disabled={isLoading} />
      </div>
      
      <EvidencePanel evidence={currentEvidence} />
    </div>
  );
};
```

#### ChatMessages
```typescript
interface ChatMessagesProps {
  messages: DiagnosisMessage[];
  isLoading?: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading }) => (
  <div className="flex-1 overflow-auto p-6 space-y-4">
    {messages.length === 0 && <WelcomeMessage />}
    
    {messages.map((message, index) => (
      <ChatMessage key={index} message={message} />
    ))}
    
    {isLoading && <TypingIndicator />}
  </div>
);

const ChatMessage: React.FC<{ message: DiagnosisMessage }> = ({ message }) => (
  <div className={cn(
    "flex",
    message.type === 'user' ? 'justify-end' : 'justify-start'
  )}>
    <div className={cn(
      "max-w-2xl p-4 rounded-lg",
      message.type === 'user' 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-muted'
    )}>
      <ReactMarkdown className="prose prose-sm dark:prose-invert">
        {message.content}
      </ReactMarkdown>
      
      {message.evidence && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <EvidenceCitations evidence={message.evidence} />
        </div>
      )}
    </div>
  </div>
);
```
#### EvidencePanel
```typescript
interface EvidencePanelProps {
  evidence: Evidence[];
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => (
  <aside className="w-80 border-l bg-muted/50">
    <div className="p-4 border-b">
      <h3 className="font-semibold">Evidence Used</h3>
      <p className="text-sm text-muted-foreground">
        RAG retrieval transparency
      </p>
    </div>
    
    <div className="p-4 space-y-3 overflow-auto">
      {evidence.map((item, index) => (
        <EvidenceCard key={index} evidence={item} />
      ))}
      
      {evidence.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Evidence will appear here during analysis</p>
        </div>
      )}
    </div>
  </aside>
);
```

### Problem Tracker Page (/problems) - Data-Rich Vertical Feed

**Layout Structure**: Data-rich table with expandable code-diff viewers (Myers diff) in vertical feed format

**Design Focus**: High-density information with expandable detailed views

**Data Fetching**:
```typescript
const useProblemsData = () => {
  const [pagination, setPagination] = useState({ page: 1, limit: 50 });
  const [sorting, setSorting] = useState({ field: 'lastAttempted', direction: 'desc' });
  const [filters, setFilters] = useState<ProblemFilters>({});

  const { data, isLoading } = useQuery({
    queryKey: ['problems', pagination, sorting, filters],
    queryFn: () => api.problems.getAll({ pagination, sorting, filters })
  });

  return { data, isLoading, pagination, setPagination, sorting, setSorting, filters, setFilters };
};
```

#### ProblemsTable
```typescript
interface ProblemsTableProps {
  problems: Problem[];
  isLoading?: boolean;
  sorting: SortConfig;
  onSort: (field: string) => void;
}

const ProblemsTable: React.FC<ProblemsTableProps> = ({ 
  problems, 
  isLoading, 
  sorting, 
  onSort 
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <SortableTableHead field="title" sorting={sorting} onSort={onSort}>
              Problem
            </SortableTableHead>
            <SortableTableHead field="difficulty" sorting={sorting} onSort={onSort}>
              Difficulty
            </SortableTableHead>
            <TableHead>Topics</TableHead>
            <SortableTableHead field="attempts" sorting={sorting} onSort={onSort}>
              Attempts
            </SortableTableHead>
            <TableHead>Result</TableHead>
            <TableHead>Root Cause</TableHead>
            <TableHead>Confidence</TableHead>
            <SortableTableHead field="lastAttempted" sorting={sorting} onSort={onSort}>
              Last Attempted
            </SortableTableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))
          ) : (
            problems.map((problem) => (
              <React.Fragment key={problem.id}>
                <ProblemTableRow 
                  problem={problem}
                  isExpanded={expandedRow === problem.id}
                  onToggleExpanded={() => setExpandedRow(
                    expandedRow === problem.id ? null : problem.id
                  )}
                />
                {expandedRow === problem.id && (
                  <ProblemExpandedRow problem={problem} />
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const ProblemExpandedRow: React.FC<{ problem: Problem }> = ({ problem }) => (
  <TableRow>
    <TableCell colSpan={8} className="p-0">
      <div className="p-6 border-t bg-muted/25">
        <CodeDiffViewer 
          oldCode={problem.lastFailedAttempt?.code}
          newCode={problem.acceptedAttempt?.code}
          language={problem.language}
        />
      </div>
    </TableCell>
  </TableRow>
);
```
### Problem Detail Page (/problems/[id]) - Structured Document Layout

**Layout Structure**: Chronological submission history, root cause analysis, and recommended learning strategies in structured document layout

**Design Focus**: Deep-dive analytical view with comprehensive failure context

**Data Fetching**:
```typescript
const useProblemDetail = (problemId: string) => {
  const { data: problem } = useQuery({
    queryKey: ['problem', problemId],
    queryFn: () => api.problems.getById(problemId)
  });

  const { data: submissions } = useQuery({
    queryKey: ['problem-submissions', problemId],
    queryFn: () => api.submissions.getByProblem(problemId)
  });

  const { data: similarProblems } = useQuery({
    queryKey: ['similar-problems', problemId],
    queryFn: () => api.problems.getSimilar(problemId)
  });

  return { problem, submissions, similarProblems };
};
```

#### ProblemDetailLayout
```typescript
const ProblemDetailLayout: React.FC<{ problemId: string }> = ({ problemId }) => {
  const { problem, submissions, similarProblems } = useProblemDetail(problemId);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <ProblemHeader problem={problem} />
      <SubmissionTimeline submissions={submissions} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RootCauseAnalysis problem={problem} />
        <SimilarProblems problems={similarProblems} />
      </div>
    </div>
  );
};
```

#### SubmissionTimeline
```typescript
interface SubmissionTimelineProps {
  submissions: Submission[];
}

const SubmissionTimeline: React.FC<SubmissionTimelineProps> = ({ submissions }) => (
  <div className="card p-6">
    <h3 className="text-lg font-semibold mb-6">Submission History</h3>
    <div className="space-y-4">
      {submissions?.map((submission, index) => (
        <TimelineItem 
          key={submission.id}
          submission={submission}
          isLast={index === submissions.length - 1}
        />
      ))}
    </div>
  </div>
);

const TimelineItem: React.FC<{ submission: Submission; isLast: boolean }> = ({ 
  submission, 
  isLast 
}) => (
  <div className="flex">
    <div className="flex flex-col items-center mr-4">
      <div className={cn(
        "w-3 h-3 rounded-full border-2",
        submission.status === 'Accepted' ? 'bg-success border-success' : 'bg-error border-error'
      )} />
      {!isLast && <div className="flex-1 w-px bg-border mt-2" />}
    </div>
    
    <div className="flex-1 pb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <StatusBadge status={submission.status} />
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(submission.timestamp)} ago
          </span>
        </div>
        <Button variant="ghost" size="sm">View Code</Button>
      </div>
      
      {submission.analysis?.rootCause && (
        <RootCauseBadge 
          rootCause={submission.analysis.rootCause}
          confidence={submission.analysis.confidence}
        />
      )}
    </div>
  </div>
);
```

### Settings Page (/settings)

**Layout Structure**: Form-based layout with sections

```typescript
const SettingsLayout: React.FC = () => {
  const { data: user } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api.user.getProfile()
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <ProfileSection user={user} />
      <IntegrationSection />
      <NotificationSection />
      <DataSection />
    </div>
  );
};
```
## 🧩 Global Intelligence Components

### Navigation Components
```typescript
#### NavigationItem
```typescript
interface NavigationItemProps {
  item: NavItem;
  isCollapsed: boolean;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item, isCollapsed }) => {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link href={item.href}>
      <motion.div 
        className={cn(
          "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200",
          "hover:bg-surface/80 hover:scale-[1.02]",
          isActive 
            ? "bg-primary/10 text-primary border border-primary/20" 
            : "text-muted-foreground hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <item.icon className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
          isCollapsed ? "w-5 h-5" : "w-4 h-4"
        )} />
        
        {!isCollapsed && (
          <>
            <span className="font-medium text-sm">{item.label}</span>
            {item.badge && (
              <motion.span 
                className="ml-auto text-micro bg-primary/20 text-primary px-2 py-0.5 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {item.badge}
              </motion.span>
            )}
          </>
        )}
      </motion.div>
    </Link>
  );
};
```

### Intelligence Display Components

#### SystemicConfidenceBar
```typescript
interface SystemicConfidenceBarProps {
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  className?: string;
}

const SystemicConfidenceBar: React.FC<SystemicConfidenceBarProps> = ({
  confidence,
  severity,
  className
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-primary'; // Brand Coral for critical
      case 'high': return 'bg-error';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
        <motion.div 
          className={cn("h-full rounded-full transition-all duration-500", getSeverityColor(severity))}
          initial={{ width: 0 }}
          animate={{ width: `${confidence * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
```

#### RiskIndexMeter (Enhanced Circular Progress)
```typescript
interface RiskIndexMeterProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showPulse?: boolean;
  className?: string;
}

const RiskIndexMeter: React.FC<RiskIndexMeterProps> = ({
  value,
  size = 100,
  strokeWidth = 8,
  showPulse = false,
  className
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  const getRiskColor = (value: number) => {
    if (value < 30) return { color: 'text-success', bg: 'rgba(34, 197, 94, 0.1)' };
    if (value < 70) return { color: 'text-warning', bg: 'rgba(245, 158, 11, 0.1)' };
    return { color: 'text-primary', bg: 'rgba(255, 95, 82, 0.1)' }; // Critical uses brand coral
  };

  const { color, bg } = getRiskColor(value);

  return (
    <div className={cn("relative", className)}>
      {showPulse && value > 70 && (
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: bg }}
        />
      )}
      
      <svg 
        width={size} 
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(var(--color-border))"
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.3}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          className={cn("transition-all duration-500", color)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className={cn("font-bold", color, size > 60 ? "text-xl" : "text-lg")}>
            {value}%
          </span>
          {size > 80 && (
            <p className="text-micro text-muted-foreground mt-0.5">Risk</p>
          )}
        </div>
      </div>
    </div>
  );
};
```
```

#### RootCauseBadge (Enhanced with Severity Indicators)
```typescript
interface RootCauseBadgeProps {
  rootCause: string;
  confidence?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

const ROOT_CAUSE_CATEGORIES = {
  'boundary-condition-error': { 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: AlertTriangle 
  },
  'algorithm-selection-mistake': { 
    color: 'bg-error/20 text-error border-error/30',
    icon: XCircle 
  },
  'pattern-recognition-gap': { 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Eye 
  },
  'performance-bottleneck': { 
    color: 'bg-warning/20 text-warning border-warning/30',
    icon: Zap 
  },
  'systemic-architecture-flaw': { 
    color: 'bg-primary/20 text-primary border-primary/30',
    icon: AlertTriangle 
  }
} as const;

const RootCauseBadge: React.FC<RootCauseBadgeProps> = ({ 
  rootCause, 
  confidence, 
  severity = 'medium',
  size = 'md',
  showPulse = false
}) => {
  const category = ROOT_CAUSE_CATEGORIES[rootCause] || ROOT_CAUSE_CATEGORIES['boundary-condition-error'];
  const Icon = category.icon;
  
  return (
    <motion.span 
      className={cn(
        "inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium",
        "transition-all duration-200 hover:scale-105",
        category.color,
        size === 'sm' && "text-micro px-2 py-1 space-x-1",
        size === 'lg' && "text-sm px-4 py-2 space-x-2",
        showPulse && severity === 'critical' && "root-cause-critical"
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Icon className={cn(
        "flex-shrink-0",
        size === 'sm' ? "w-3 h-3" : size === 'lg' ? "w-5 h-5" : "w-4 h-4"
      )} />
      
      <span className="truncate max-w-32">
        {formatRootCauseName(rootCause)}
      </span>
      
      {confidence && (
        <span className="opacity-80 font-semibold">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </motion.span>
  );
};

const formatRootCauseName = (rootCause: string): string => {
  return rootCause
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
```
```
#### Enhanced Code Diff Viewer (Myers Diff with Reveal Animation)
```typescript
interface CodeDiffViewerProps {
  oldCode?: string;
  newCode?: string;
  language: string;
  showLineNumbers?: boolean;
  enableRevealAnimation?: boolean;
  className?: string;
}

const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  oldCode = '',
  newCode = '',
  language,
  showLineNumbers = true,
  enableRevealAnimation = true,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const diff = useMemo(() => computeMyersDiff(oldCode, newCode), [oldCode, newCode]);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("surface-elevated rounded-lg overflow-hidden", className)}>
      {/* Diff Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpansion}
            className="text-sm font-medium"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
            </motion.div>
            Code Evolution Analysis
          </Button>
          <TechnicalLanguageBadge language={language} />
        </div>
        
        <div className="flex items-center space-x-4 text-caption">
          <DiffStats diff={diff} />
        </div>
      </div>
      
      {/* Expandable Diff Content with Myers Diff Reveal Animation */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.3, ease: "easeOut" },
              opacity: { duration: 0.2, delay: enableRevealAnimation ? 0.1 : 0 }
            }}
            className="overflow-hidden"
          >
            <div className="max-h-96 overflow-auto">
              <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'rgb(var(--color-surface))',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
                showLineNumbers={showLineNumbers}
                wrapLines
                lineProps={(lineNumber) => {
                  const change = diff.changes.find(c => c.lineNumber === lineNumber);
                  return {
                    style: {
                      backgroundColor: change?.type === 'addition' 
                        ? 'rgba(34, 197, 94, 0.15)'
                        : change?.type === 'deletion'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'transparent',
                      borderLeft: change?.type 
                        ? `3px solid ${change.type === 'addition' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}`
                        : 'none',
                      paddingLeft: change?.type ? '0.5rem' : '0.75rem'
                    }
                  };
                }}
              >
                {newCode}
              </SyntaxHighlighter>
            </div>
            
            {/* Diff Analysis Footer */}
            <div className="p-4 border-t border-border bg-surface/50">
              <DiffAnalysisInsights diff={diff} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DiffStats: React.FC<{ diff: MyersDiffResult }> = ({ diff }) => (
  <div className="flex items-center space-x-3">
    <span className="flex items-center space-x-1 text-success">
      <Plus className="w-3 h-3" />
      <span>+{diff.additions}</span>
    </span>
    <span className="flex items-center space-x-1 text-error">
      <Minus className="w-3 h-3" />
      <span>-{diff.deletions}</span>
    </span>
    <span className="text-muted-foreground">
      {diff.changes.length} changes
    </span>
  </div>
);

const DiffAnalysisInsights: React.FC<{ diff: MyersDiffResult }> = ({ diff }) => (
  <div className="space-y-2">
    <h4 className="font-medium text-sm">Pattern Analysis</h4>
    <div className="flex flex-wrap gap-2">
      {diff.patterns.map((pattern, index) => (
        <span 
          key={index}
          className="text-micro px-2 py-1 bg-primary/10 text-primary rounded"
        >
          {pattern}
        </span>
      ))}
    </div>
  </div>
);

// Enhanced Myers Diff computation with pattern detection
interface MyersDiffResult {
  changes: DiffChange[];
  additions: number;
  deletions: number;
  patterns: string[]; // Detected failure patterns
}

const computeMyersDiff = (oldCode: string, newCode: string): MyersDiffResult => {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  
  // Implement Myers diff algorithm
  const changes: DiffChange[] = [];
  const patterns: string[] = [];
  
  // Pattern detection for common failure types
  if (detectBoundaryConditionChanges(oldLines, newLines)) {
    patterns.push('Boundary Condition Fix');
  }
  
  if (detectAlgorithmRefactoring(oldLines, newLines)) {
    patterns.push('Algorithm Optimization');
  }
  
  // ... diff computation logic
  
  return {
    changes,
    additions: changes.filter(c => c.type === 'addition').length,
    deletions: changes.filter(c => c.type === 'deletion').length,
    patterns
  };
};
```
```

#### KnowledgeNode Component (Enhanced for Knowledge Graph)
```typescript
interface KnowledgeNodeProps {
  data: {
    id: string;
    type: 'Problem' | 'FailureEvent' | 'RootCause' | 'Weakness' | 'LearningStrategy';
    label: string;
    confidence?: number;
    severity?: 'critical' | 'high' | 'medium' | 'low';
    metadata?: {
      frequency?: number;
      lastOccurrence?: Date;
      riskIndex?: number;
    };
  };
  selected?: boolean;
  isHighlighted?: boolean;
}

const KnowledgeNode: React.FC<KnowledgeNodeProps> = ({ data, selected, isHighlighted }) => {
  const getNodeStyling = (type: string, severity?: string) => {
    const baseStyles = {
      Problem: { 
        bg: 'bg-blue-500', 
        border: 'border-blue-400', 
        text: 'text-white',
        glow: 'shadow-blue-500/20'
      },
      FailureEvent: { 
        bg: 'bg-failure', 
        border: 'border-failure', 
        text: 'text-white',
        glow: 'shadow-failure/20'
      },
      RootCause: { 
        bg: severity === 'critical' ? 'bg-primary' : 'bg-root-cause', 
        border: severity === 'critical' ? 'border-primary' : 'border-root-cause', 
        text: 'text-white',
        glow: severity === 'critical' ? 'shadow-primary/30' : 'shadow-root-cause/20'
      },
      Weakness: { 
        bg: 'bg-weakness', 
        border: 'border-weakness', 
        text: 'text-white',
        glow: 'shadow-weakness/20'
      },
      LearningStrategy: { 
        bg: 'bg-strategy', 
        border: 'border-strategy', 
        text: 'text-white',
        glow: 'shadow-strategy/20'
      }
    };
    
    return baseStyles[type] || baseStyles.Problem;
  };

  const getNodeIcon = (type: string) => {
    const iconMap = {
      Problem: DocumentTextIcon,
      FailureEvent: ExclamationTriangleIcon,
      RootCause: MagnifyingGlassIcon,
      Weakness: BoltIcon,
      LearningStrategy: LightBulbIcon
    };
    return iconMap[type] || DocumentTextIcon;
  };

  const styling = getNodeStyling(data.type, data.severity);
  const Icon = getNodeIcon(data.type);

  return (
    <motion.div 
      className={cn(
        "relative px-4 py-3 rounded-xl border-2 font-medium text-sm",
        "transition-all duration-300 cursor-pointer",
        "min-w-[140px] max-w-[220px] backdrop-blur-sm",
        styling.bg,
        styling.border,
        styling.text,
        "hover:shadow-lg hover:scale-105",
        selected && "ring-2 ring-white ring-offset-2 ring-offset-transparent",
        isHighlighted && "animate-pulse",
        data.severity === 'critical' && "root-cause-critical"
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        boxShadow: selected ? `0 8px 25px ${styling.glow}` : `0 4px 15px ${styling.glow}`
      }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: `0 12px 30px ${styling.glow}`
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Node Content */}
      <div className="flex items-start space-x-2">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{data.label}</div>
          
          {/* Metadata Display */}
          {data.metadata && (
            <div className="text-xs opacity-80 mt-1 space-y-0.5">
              {data.metadata.frequency && (
                <div>{data.metadata.frequency}x occurrences</div>
              )}
              {data.metadata.riskIndex && (
                <div>Risk: {data.metadata.riskIndex}%</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Confidence Indicator */}
      {data.confidence && (
        <div className="mt-2">
          <div className="w-full bg-white/20 rounded-full h-1">
            <motion.div 
              className="bg-white h-1 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${data.confidence * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </div>
      )}
      
      {/* Critical Severity Indicator */}
      {data.severity === 'critical' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <AlertTriangle className="w-2 h-2 text-primary" />
        </div>
      )}
    </motion.div>
  );
};

// Enhanced node types for React Flow
const knowledgeGraphNodeTypes = {
  knowledgeNode: KnowledgeNode,
  problemNode: (props) => <KnowledgeNode {...props} data={{ ...props.data, type: 'Problem' }} />,
  failureNode: (props) => <KnowledgeNode {...props} data={{ ...props.data, type: 'FailureEvent' }} />,
  rootCauseNode: (props) => <KnowledgeNode {...props} data={{ ...props.data, type: 'RootCause' }} />,
  weaknessNode: (props) => <KnowledgeNode {...props} data={{ ...props.data, type: 'Weakness' }} />,
  strategyNode: (props) => <KnowledgeNode {...props} data={{ ...props.data, type: 'LearningStrategy' }} />,
};
```
```
#### EvidenceCard (RAG Transparency Component)
```typescript
interface EvidenceCardProps {
  evidence: RAGEvidence;
  className?: string;
  onExpand?: () => void;
}

type RAGEvidence = {
  id: string;
  type: 'graph_node' | 'past_failure' | 'code_pattern' | 'statistical' | 'documentation';
  title: string;
  description: string;
  confidence: number;
  retrievalScore: number;
  sourceContext?: string;
  metadata?: Record<string, any>;
};

const EvidenceCard: React.FC<EvidenceCardProps> = ({ 
  evidence, 
  className,
  onExpand 
}) => {
  const getEvidenceIcon = (type: RAGEvidence['type']) => {
    switch (type) {
      case 'graph_node': return <ShareIcon className="w-4 h-4" />;
      case 'past_failure': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'code_pattern': return <CodeBracketIcon className="w-4 h-4" />;
      case 'statistical': return <ChartBarIcon className="w-4 h-4" />;
      case 'documentation': return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const getEvidenceColor = (type: RAGEvidence['type']) => {
    switch (type) {
      case 'graph_node': return 'text-blue-400 bg-blue-500/10';
      case 'past_failure': return 'text-failure bg-failure/10';
      case 'code_pattern': return 'text-weakness bg-weakness/10';
      case 'statistical': return 'text-success bg-success/10';
      case 'documentation': return 'text-muted-foreground bg-surface';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "p-3 surface-elevated rounded-lg hover:bg-surface/80 transition-all cursor-pointer group",
        className
      )}
      onClick={onExpand}
    >
      <div className="flex items-start space-x-3">
        <div className={cn(
          "p-2 rounded-md transition-transform group-hover:scale-110",
          getEvidenceColor(evidence.type)
        )}>
          {getEvidenceIcon(evidence.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm truncate">{evidence.title}</h4>
            <div className="flex items-center space-x-2">
              <RAGConfidenceBadge 
                confidence={evidence.confidence}
                retrievalScore={evidence.retrievalScore}
              />
            </div>
          </div>
          
          <p className="text-caption text-muted-foreground line-clamp-2 mb-2">
            {evidence.description}
          </p>
          
          {evidence.sourceContext && (
            <div className="text-micro text-muted-foreground bg-surface px-2 py-1 rounded">
              <CodeIcon className="w-3 h-3 inline mr-1" />
              {evidence.sourceContext}
            </div>
          )}
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </motion.div>
  );
};

const RAGConfidenceBadge: React.FC<{ 
  confidence: number; 
  retrievalScore: number; 
}> = ({ confidence, retrievalScore }) => {
  const combinedScore = (confidence * 0.7) + (retrievalScore * 0.3);
  
  return (
    <div className="flex items-center space-x-1">
      <span className={cn(
        "text-micro px-1.5 py-0.5 rounded font-medium",
        combinedScore >= 0.8 
          ? "bg-success/20 text-success" 
          : combinedScore >= 0.6
          ? "bg-warning/20 text-warning"
          : "bg-error/20 text-error"
      )}>
        {Math.round(combinedScore * 100)}%
      </span>
    </div>
  );
};
```

### Knowledge Graph Node Component
```typescript
interface GraphNodeProps {
  data: {
    id: string;
    type: 'Problem' | 'FailureEvent' | 'RootCause' | 'Weakness' | 'LearningStrategy';
    label: string;
    confidence?: number;
    metadata?: Record<string, any>;
  };
  selected?: boolean;
}

const GraphNodeComponent: React.FC<GraphNodeProps> = ({ data, selected }) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Problem': return 'bg-blue-500 border-blue-600';
      case 'FailureEvent': return 'bg-orange-500 border-orange-600';
      case 'RootCause': return 'bg-amber-500 border-amber-600';
      case 'Weakness': return 'bg-purple-500 border-purple-600';
      case 'LearningStrategy': return 'bg-green-500 border-green-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Problem': return <DocumentTextIcon className="w-3 h-3" />;
      case 'FailureEvent': return <ExclamationTriangleIcon className="w-3 h-3" />;
      case 'RootCause': return <MagnifyingGlassIcon className="w-3 h-3" />;
      case 'Weakness': return <BoltIcon className="w-3 h-3" />;
      case 'LearningStrategy': return <LightBulbIcon className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <div className={cn(
      "px-3 py-2 rounded-lg border-2 bg-white text-white text-xs font-medium",
      "shadow-sm hover:shadow-md transition-all duration-200",
      "min-w-[120px] max-w-[200px]",
      getNodeColor(data.type),
      selected && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="flex items-center space-x-2">
        {getIcon(data.type)}
        <span className="truncate">{data.label}</span>
      </div>
      
      {data.confidence && (
        <div className="mt-1 w-full bg-white/20 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-300"
            style={{ width: `${data.confidence * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

// React Flow node types configuration
const customNodeTypes = {
  graphNode: GraphNodeComponent,
};
```
## 📁 Repository Structure

```
/components/          # Shared UI components
├── navigation/
│   ├── TopAppBar.tsx
│   ├── NavigationDrawer.tsx
│   └── NavigationItem.tsx
├── intelligence/
│   ├── EvidenceCard.tsx
│   ├── KnowledgeNode.tsx
│   ├── RootCauseBadge.tsx
│   ├── SystemicWeaknessCard.tsx
│   └── RiskIndexMeter.tsx
├── data-visualization/
│   ├── CodeDiffViewer.tsx
│   ├── FailureTimeline.tsx
│   └── KnowledgeGraphCanvas.tsx
└── ui/              # Base UI components
    ├── Button.tsx
    ├── Card.tsx
    ├── Badge.tsx
    └── ...

/app/                # Next.js 15 App Router pages
├── (marketing)/
│   └── page.tsx     # Landing page
├── (authenticated)/
│   ├── dashboard/
│   ├── graph/
│   ├── diagnosis/
│   ├── problems/
│   └── settings/
└── layout.tsx

/styles/             # Global CSS and design tokens
├── globals.css      # Tailwind base + custom properties
├── components.css   # Component-specific styles
└── animations.css   # Motion & interaction styles

/lib/                # Core logic and utilities
├── graph/           # Relational graph traversal
├── rag/            # RAG inference and retrieval
├── inference/      # Root cause analysis
└── utils/          # Shared utilities
```

## 🧬 Component Hierarchy Tree

```
Praxis Intelligence System
├── Landing Page (/) - High-Impact Value Proposition
│   └── TopAppBar (Minimal Navigation)
│   └── HeroSection
│   └── FeatureHighlights
│       └── DiagnosticFeatureCard[]
│           ├── Technical Icons
│           └── Confidence Metrics
│
├── Authenticated Intelligence Layout
│   ├── NavigationDrawer (Systemic Navigation)
│   │   └── NavigationItem[] (with Active States & Badges)
│   ├── TopAppBar (Intelligence Context)
│   │   ├── Breadcrumbs
│   │   ├── RiskIndicators
│   │   └── UserIntelligenceMenu
│   │
│   ├── Dashboard - Real-Time Intelligence Hub
│   │   ├── CriticalWeaknessCard (High-Density Display)
│   │   │   └── SystemicWeaknessItem[]
│   │   │       ├── SeverityBadge
│   │   │       ├── RiskIndexMeter
│   │   │       └── SystemicConfidenceBar
│   │   ├── RecentFailuresFeed (Vertical Data Feed)
│   │   │   └── FailureEventCard[]
│   │   │       ├── TechnicalDifficultyBadge
│   │   │       ├── RootCauseBadge (Enhanced)
│   │   │       └── ConfidenceIndicator
│   │   ├── RiskPredictionWidget
│   │   │   └── RiskIndexMeter (with Pulse Animation)
│   │   └── MiniKnowledgeGraph
│   │       └── ReactFlow
│   │           └── KnowledgeNode[] (Enhanced Intelligence Nodes)
│   │
│   ├── Graph Explorer - Full-Canvas Intelligence Mapping
│   │   ├── GraphFilterDrawer
│   │   │   ├── SystemicTopicFilter
│   │   │   ├── RootCauseTypeFilter  
│   │   │   ├── TemporalRangeFilter
│   │   │   └── ConfidenceThresholdSlider
│   │   ├── KnowledgeGraphCanvas (Full-Bleed)
│   │   │   └── ReactFlow
│   │   │       ├── KnowledgeNode[] (Critical Pulse Animation)
│   │   │       ├── IntelligenceEdge[]
│   │   │       ├── Background
│   │   │       ├── Controls
│   │   │       └── MiniMap
│   │   ├── GraphIntelligenceControls
│   │   └── NodeDetailDrawer (Bottom Sheet)
│   │       ├── NodeIntelligenceProperties
│   │       ├── SystemicRelationships
│   │       └── FailurePatternInsights
│   │
│   ├── AI Diagnosis - Split-Pane RAG Interface  
│   │   ├── DiagnosisChat (60% Split)
│   │   │   ├── IntelligenceWelcomeMessage
│   │   │   ├── DiagnosisMessage[] (Chain-of-Thought)
│   │   │   │   ├── ReactMarkdown (Technical Formatting)
│   │   │   │   └── EvidenceCitations
│   │   │   ├── RAGStreamingIndicator
│   │   │   └── IntelligentChatInput
│   │   └── RAGEvidencePanel (40% Split)
│   │       └── EvidenceCard[] (Streaming Animation)
│   │           ├── RAGConfidenceBadge
│   │           └── SourceContextPreview
│   │
│   ├── Problem Tracker - Data-Rich Vertical Feed
│   │   ├── IntelligentFilters
│   │   ├── TechnicalProblemsTable
│   │   │   ├── SortableIntelligenceHeader[]
│   │   │   └── ProblemAnalysisRow[]
│   │   │       └── ExpandableCodeDiffViewer (Myers Diff Reveal)
│   │   │           ├── DiffStats
│   │   │           ├── PatternAnalysisInsights
│   │   │           └── SyntaxHighlighter (Enhanced)
│   │   └── IntelligentPagination
│   │
│   ├── Problem Deep Dive - Structured Intelligence Document
│   │   ├── TechnicalProblemHeader
│   │   ├── FailureIntelligenceTimeline
│   │   │   └── IntelligenceTimelineItem[]
│   │   │       ├── TechnicalStatusBadge
│   │   │       ├── RootCauseBadge (Enhanced) 
│   │   │       └── ConfidenceEvolution
│   │   ├── SystemicRootCauseAnalysis
│   │   └── RelatedIntelligenceProblems
│   │
│   └── Settings - Intelligence Configuration
│       ├── TechnicalProfileSection
│       ├── SystemIntegrationSection
│       ├── IntelligenceNotificationSection
│       └── DiagnosticDataSection
│
└── Intelligence Components Library
    ├── Navigation Intelligence
    │   ├── TopAppBar (Context-Aware)
    │   ├── NavigationDrawer (Systemic)
    │   └── NavigationItem (State Management)
    │
    ├── Diagnostic Visualizations
    │   ├── SystemicConfidenceBar
    │   ├── RiskIndexMeter (Animated)
    │   ├── RootCauseBadge (Enhanced Severity)
    │   ├── CodeDiffViewer (Myers Diff + Reveal)
    │   ├── EvidenceCard (RAG Transparency)
    │   └── KnowledgeNode (Knowledge Graph Intelligence)
    │
    ├── Technical Interface Components
    │   ├── IntelligentButton
    │   ├── DiagnosticInput
    │   ├── TechnicalSelect
    │   ├── IntelligenceCard
    │   ├── SystemicDrawer
    │   ├── DiagnosticTable
    │   ├── ConfidenceBadge
    │   └── LoadingIntelligenceIndicator
    │
    └── State & Error Management
        ├── IntelligenceEmptyState
        ├── SystemicErrorBoundary
        ├── DiagnosticLoadingSpinner
        └── TechnicalSkeletonLoader[]
```
## Loading, Empty, and Error States

### Loading States

#### Skeleton Components
```typescript
const WeaknessSkeleton: React.FC = () => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="h-2 w-full" />
  </div>
);

const FailureCardSkeleton: React.FC = () => (
  <div className="p-3 rounded-lg border bg-muted/50">
    <div className="flex items-start justify-between mb-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-5 w-12" />
    </div>
    <Skeleton className="h-3 w-24 mb-2" />
    <Skeleton className="h-5 w-32" />
  </div>
);

const GraphSkeleton: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading graph...</p>
    </div>
  </div>
);
```

#### Page-Level Loading
```typescript
const DashboardLoading: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
    <div className="card p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        <WeaknessSkeleton />
        <WeaknessSkeleton />
        <WeaknessSkeleton />
      </div>
    </div>
    <div className="card p-6">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="space-y-3">
        <FailureCardSkeleton />
        <FailureCardSkeleton />
        <FailureCardSkeleton />
      </div>
    </div>
    <div className="card p-6">
      <Skeleton className="h-6 w-36 mb-4" />
      <div className="flex items-center justify-center h-32">
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>
    </div>
  </div>
);
```

### Empty States

```typescript
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = InboxIcon,
  title,
  message,
  description,
  action
}) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
    {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
    <p className="text-muted-foreground mb-2">{message}</p>
    {description && (
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
    )}
    {action && (
      <Button onClick={action.onClick} variant="outline">
        {action.label}
      </Button>
    )}
  </div>
);

// Specific empty states
const NoWeaknessesEmpty: React.FC = () => (
  <EmptyState
    icon={ChartBarIcon}
    message="No weaknesses identified yet"
    description="Submit more coding attempts to get personalized insights"
    action={{
      label: "Connect LeetCode",
      onClick: () => router.push('/settings')
    }}
  />
);

const NoFailuresEmpty: React.FC = () => (
  <EmptyState
    icon={CheckCircleIcon}
    title="All caught up!"
    message="No recent failures to analyze"
    description="Keep coding! Your failures will appear here for analysis"
  />
);
```

### Error States

```typescript
interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  showDetails?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  onRetry, 
  showDetails = false 
}) => (
  <div className="text-center py-12">
    <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-error" />
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="text-muted-foreground mb-4">
      {error.message || "An unexpected error occurred"}
    </p>
    
    <div className="flex items-center justify-center space-x-2">
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
      <Button variant="ghost" onClick={() => router.push('/dashboard')}>
        Go to Dashboard
      </Button>
    </div>
    
    {showDetails && (
      <details className="mt-4 text-left max-w-md mx-auto">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Error details
        </summary>
        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
          {error.stack}
        </pre>
      </details>
    )}
  </div>
);
```

## Animations and Interactions

### Page Transitions
```typescript
// Using Framer Motion for page animations
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);
```

### Graph Interactions
```typescript
// React Flow interaction handlers
const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  setSelectedNode(node.data as GraphNode);
  
  // Highlight connected nodes
  const connectedEdges = edges.filter(edge => 
    edge.source === node.id || edge.target === node.id
  );
  setHighlightedEdges(connectedEdges.map(edge => edge.id));
}, [edges]);

const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
  // Show tooltip with node details
  setHoveredNode(node);
}, []);
```

### Smooth Scrolling and Focus Management
```typescript
// Auto-scroll to new chat messages
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }
}, [messages]);

// Focus management for accessibility
const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  firstElement?.focus();
};
```

This comprehensive UI specification provides the complete frontend architecture for Praxis, covering all pages, components, interactions, and states needed to build the AI-powered failure intelligence platform.

## 🎭 Enhanced Loading, Empty, and Error States

### Intelligent Loading States

#### Diagnostic Loading Components
```typescript
const SystemicWeaknessSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-40 bg-surface" />
      <Skeleton className="h-6 w-16 bg-surface rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-2 w-full bg-surface" />
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12 bg-surface rounded" />
        <Skeleton className="h-4 w-16 bg-surface rounded" />
      </div>
    </div>
  </div>
);

const RAGEvidenceStreamingSkeleton: React.FC = () => (
  <motion.div 
    className="space-y-3"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {[1, 2, 3].map((i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="p-3 surface-elevated rounded-lg"
      >
        <div className="flex items-start space-x-3">
          <Skeleton className="w-8 h-8 rounded-md bg-surface" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32 bg-surface" />
            <Skeleton className="h-2 w-full bg-surface" />
            <Skeleton className="h-2 w-3/4 bg-surface" />
          </div>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

const KnowledgeGraphLoadingState: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Share className="w-12 h-12 text-primary mx-auto" />
      </motion.div>
      <div>
        <p className="font-medium text-lg">Mapping Intelligence Patterns</p>
        <p className="text-caption text-muted-foreground">
          Analyzing systemic relationships...
        </p>
      </div>
    </div>
  </div>
);
```

## 🌊 Enhanced Motion & Interactivity Specifications

### Functional Animation System

```css
/* Root Cause Critical Pulse - Brand Coral Attention */
@keyframes root-cause-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(255, 95, 82, 0.4);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 0 12px rgba(255, 95, 82, 0.1);
    transform: scale(1.02);
  }
}

.root-cause-critical {
  animation: root-cause-pulse 2s ease-in-out infinite;
}

/* Myers Diff Reveal - Smooth Expansion */
.diff-reveal-enter {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

.diff-reveal-enter-active {
  max-height: 400px;
  opacity: 1;
  transition: max-height 0.3s ease-out, opacity 0.2s ease-out 0.1s;
}

/* RAG Evidence Streaming - Staggered Entrance */
.evidence-stream-enter {
  opacity: 0;
  transform: translateY(10px);
}

.evidence-stream-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

/* Spring-based Drawer Animations */
.drawer-slide-enter {
  transform: translateX(100%);
}

.drawer-slide-enter-active {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Intelligence Node Hover States */
.intelligence-node {
  transition: all 0.2s ease-out;
}

.intelligence-node:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 30px rgba(var(--node-color), 0.3);
}
```

## 🔧 Implementation Guidelines

### Performance Optimization
- **Code Splitting**: Dynamic imports for heavy components (ReactFlow, SyntaxHighlighter)
- **Virtualization**: Use react-window for large data tables and lists
- **Memoization**: React.memo for expensive re-renders of intelligence components
- **Lazy Loading**: Progressive loading of graph nodes and evidence cards

### Accessibility Standards
- **WCAG 2.1 AA**: Full compliance with focus management and screen readers
- **Keyboard Navigation**: Tab order optimization for complex graph interfaces
- **Color Contrast**: 4.5:1 ratio maintained in dark theme
- **Motion Reduction**: Respect prefers-reduced-motion for animations

### Technical Excellence
- **TypeScript**: Strict mode with comprehensive type definitions
- **Testing**: Component testing with React Testing Library
- **Documentation**: Storybook for component library
- **Performance**: Core Web Vitals monitoring and optimization

This enhanced Praxis UI specification represents a sophisticated diagnostic intelligence system that transforms complex failure analysis into intuitive, actionable insights through advanced data visualization, intelligent interactions, and systematic design principles.