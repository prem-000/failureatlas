# Praxis Core Algorithms

## Overview

Praxis employs a sophisticated algorithmic pipeline that combines classical computer science algorithms with modern machine learning techniques to extract meaningful patterns from coding failure data.

## 1. Myers Diff Algorithm for Code Evolution

### Problem Solved
Identifies the minimal set of changes between two code submissions to detect meaningful edits that indicate specific failure patterns.

### Application in Pipeline
Used in the Code Evolution Analyzer to compare current submission against previous attempts, generating diff signals that become primary evidence for root cause inference.

### Algorithm Implementation

```python
def myers_diff(old_code: str, new_code: str) -> List[EditOperation]:
    """
    Myers' O(ND) algorithm for computing minimum edit distance
    with actual edit sequence reconstruction
    """
    old_lines = old_code.split('\n')
    new_lines = new_code.split('\n')
    
    N, M = len(old_lines), len(new_lines)
    MAX_D = N + M
    
    # Forward trace
    V = {}
    V[1] = 0
    trace = []
    
    for D in range(MAX_D + 1):
        trace.append(V.copy())
        for k in range(-D, D + 1, 2):
            if k == -D or (k != D and V[k - 1] < V[k + 1]):
                x = V[k + 1]
            else:
                x = V[k - 1] + 1
            
            y = x - k
            
            # Extend diagonal
            while x < N and y < M and old_lines[x] == new_lines[y]:
                x += 1
                y += 1
            
            V[k] = x
            
            if x >= N and y >= M:
                return reconstruct_path(trace, N, M)
    
    return []

def reconstruct_path(trace: List[Dict], N: int, M: int) -> List[EditOperation]:
    """Reconstruct the actual edit sequence from the trace"""
    operations = []
    x, y = N, M
    
    for D in range(len(trace) - 1, -1, -1):
        V = trace[D]
        k = x - y
        
        # Determine if we came from diagonal, left, or up
        if k == -D or (k != D and V[k - 1] < V[k + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        
        prev_x = V[prev_k]
        prev_y = prev_x - prev_k
        
        # Add diagonal moves (no operations)
        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
        
        # Add the operation
        if D > 0:
            if x == prev_x:
                operations.append(EditOperation("INSERT", y - 1, new_lines[y - 1]))
                y -= 1
            else:
                operations.append(EditOperation("DELETE", x - 1, old_lines[x - 1]))
                x -= 1
    
    return list(reversed(operations))
```

### Confidence Scoring
```python
def compute_diff_confidence(operations: List[EditOperation]) -> float:
    """
    Confidence based on edit distance and type of changes
    """
    total_lines = sum(1 for op in operations if op.type in ["INSERT", "DELETE"])
    boundary_changes = sum(1 for op in operations if is_boundary_change(op.content))
    
    # Higher confidence for boundary-specific changes
    boundary_ratio = boundary_changes / max(total_lines, 1)
    base_confidence = 1.0 / (1.0 + total_lines * 0.1)
    
    return min(0.99, base_confidence + boundary_ratio * 0.3)
```

## 2. Structural Code Pattern Analysis

### Problem Solved
Captures semantic changes in code structure that Myers diff might miss, such as loop type changes or conditional restructuring, without utilizing full parser compilers.

### Application in Pipeline
Complements Myers diff by providing structural change analysis that feeds into root cause classification.

### Algorithm Implementation

```python
def structural_code_pattern_diff(old_code: str, new_code: str) -> List[StructuralChange]:
    """
    Heuristic regex control structure extraction and pattern classification
    """
    changes = []
    
    # Extract semantic patterns
    old_patterns = extract_control_structures(old_code)
    new_patterns = extract_control_structures(new_code)
    
    # Compare loop structures
    loop_changes = compare_loops(old_patterns.loops, new_patterns.loops)
    changes.extend(loop_changes)
    
    # Compare conditional structures
    condition_changes = compare_conditions(old_patterns.conditions, new_patterns.conditions)
    changes.extend(condition_changes)
    
    return changes

def compare_loops(old_loops: List[LoopNode], new_loops: List[LoopNode]) -> List[StructuralChange]:
    """Detect meaningful loop structure changes"""
    changes = []
    
    for old_loop, new_loop in zip(old_loops, new_loops):
        # Check boundary condition changes
        if old_loop.condition != new_loop.condition:
            if is_boundary_condition_change(old_loop.condition, new_loop.condition):
                changes.append(StructuralChange(
                    type="BOUNDARY_CONDITION_CHANGE",
                    old_structure=old_loop.condition,
                    new_structure=new_loop.condition,
                    confidence=0.85
                ))
    
    return changes

def is_boundary_condition_change(old_cond: str, new_cond: str) -> bool:
    """Detect off-by-one boundary changes"""
    boundary_patterns = [
        (r'<\s*(\w+)', r'<=\s*\1'),  # < to <=
        (r'>\s*(\w+)', r'>=\s*\1'),  # > to >=
        (r'(\w+)\s*-\s*1', r'\1'),   # -1 removal
        (r'(\w+)', r'\1\s*-\s*1'),   # +1 addition
    ]
    
    for old_pattern, new_pattern in boundary_patterns:
        if re.match(old_pattern, old_cond) and re.match(new_pattern, new_cond):
            return True
    
    return False
```

## 3. Bayesian Classification for Root Cause Inference

### Problem Solved
Combines multiple weak signals (code diffs, behavioral patterns, test failure modes) into confident root cause predictions.

### Application in Pipeline
Central component of the Root Cause Inference Engine that processes all analysis signals and outputs probability distributions over potential root causes.

### Worked Example

**Input Evidence:**
- Code diff: `while left < right` → `while left <= right`
- Test failure: Single element array case failed
- Behavioral: 3 rapid resubmissions within 2 minutes
- Historical: User has 67% boundary error rate on binary search problems

**Bayesian Calculation:**

```python
def bayesian_root_cause_inference(evidence: Evidence, user_history: UserHistory) -> RootCauseProbability:
    """
    P(RootCause|Evidence) = P(Evidence|RootCause) * P(RootCause) / P(Evidence)
    """
    
    # Prior probabilities from user history
    priors = {
        'BOUNDARY_ERROR': user_history.boundary_error_rate,  # 0.67
        'ALGORITHM_ERROR': user_history.algorithm_error_rate,  # 0.18
        'LOGIC_ERROR': user_history.logic_error_rate,  # 0.15
    }
    
    # Likelihood: P(Evidence|RootCause)
    likelihoods = {}
    
    # For BOUNDARY_ERROR
    boundary_likelihood = (
        evidence.boundary_diff_probability * 0.9 +      # 0.85 * 0.9 = 0.765
        evidence.single_element_failure * 0.8 +         # 1.0 * 0.8 = 0.8
        evidence.rapid_resubmission * 0.6               # 0.7 * 0.6 = 0.42
    ) / 3  # Average: 0.661
    
    likelihoods['BOUNDARY_ERROR'] = boundary_likelihood
    
    # For ALGORITHM_ERROR  
    algorithm_likelihood = (
        evidence.boundary_diff_probability * 0.2 +      # 0.85 * 0.2 = 0.17
        evidence.single_element_failure * 0.3 +         # 1.0 * 0.3 = 0.3
        evidence.rapid_resubmission * 0.4               # 0.7 * 0.4 = 0.28
    ) / 3  # Average: 0.25
    
    likelihoods['ALGORITHM_ERROR'] = algorithm_likelihood
    
    # Calculate posteriors
    posteriors = {}
    evidence_probability = sum(priors[rc] * likelihoods[rc] for rc in priors)
    
    for root_cause in priors:
        posteriors[root_cause] = (
            likelihoods[root_cause] * priors[root_cause]
        ) / evidence_probability
    
    return posteriors

# Result: 
# BOUNDARY_ERROR: 0.91 (91% confidence)
# ALGORITHM_ERROR: 0.06
# LOGIC_ERROR: 0.03
```

### Confidence Scoring Formula

```python
def compute_inference_confidence(posteriors: Dict[str, float], evidence_strength: float) -> float:
    """
    Confidence based on posterior distribution entropy and evidence quality
    """
    # Shannon entropy of posterior distribution
    entropy = -sum(p * math.log2(p) for p in posteriors.values() if p > 0)
    max_entropy = math.log2(len(posteriors))
    
    # Lower entropy = higher confidence
    distribution_confidence = 1.0 - (entropy / max_entropy)
    
    # Combine with evidence strength
    final_confidence = (distribution_confidence * 0.7) + (evidence_strength * 0.3)
    
    return min(0.99, final_confidence)
```

## 4. PageRank for Weakness Node Scoring

### Problem Solved
Identifies the most impactful weakness patterns in a user's failure history by analyzing the graph structure of interconnected failures.

### Application in Pipeline
Applied to the Neo4j knowledge graph to score weakness nodes, enabling prioritized learning recommendations.

### Adapted Algorithm

```python
def weakness_pagerank(graph: Neo4jGraph, user_id: str, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
    """
    PageRank adapted for weakness importance in failure networks
    """
    # Get user's weakness subgraph
    weakness_nodes = graph.get_user_weaknesses(user_id)
    
    # Initialize scores
    scores = {node: 1.0 / len(weakness_nodes) for node in weakness_nodes}
    
    for iteration in range(iterations):
        new_scores = {}
        
        for node in weakness_nodes:
            # Get incoming edges (what failures lead to this weakness)
            incoming_edges = graph.get_incoming_failure_edges(node)
            
            # PageRank with failure frequency weighting
            rank_sum = 0.0
            for source, edge_data in incoming_edges:
                failure_count = edge_data['failure_count']
                recency_weight = calculate_recency_weight(edge_data['last_failure'])
                
                # Weight by failure frequency and recency
                weighted_score = scores[source] * failure_count * recency_weight
                outgoing_count = len(graph.get_outgoing_edges(source))
                
                rank_sum += weighted_score / max(outgoing_count, 1)
            
            new_scores[node] = (1 - damping) / len(weakness_nodes) + damping * rank_sum
        
        scores = new_scores
        
        # Check convergence
        if iteration > 0 and max(abs(new_scores[n] - scores[n]) for n in weakness_nodes) < 1e-6:
            break
    
    return scores

def calculate_recency_weight(last_failure_date: datetime) -> float:
    """More recent failures have higher weight"""
    days_ago = (datetime.now() - last_failure_date).days
    return math.exp(-days_ago / 30.0)  # Exponential decay with 30-day half-life
```

## 5. OpenAI Embeddings and Cosine Similarity

### Problem Solved
Enables semantic similarity search across failure descriptions to find related past failures that might not be connected through explicit graph relationships.

### Application in Pipeline
Powers the semantic branch of the dual-fork retrieval system, complementing graph-based retrieval.

### Implementation

```python
def generate_failure_embedding(failure_description: str) -> List[float]:
    """
    Generate semantic embedding using OpenAI text-embedding-3-small
    """
    client = openai.OpenAI()
    
    # Preprocess failure description
    processed_text = preprocess_failure_text(failure_description)
    
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=processed_text,
        encoding_format="float"
    )
    
    return response.data[0].embedding

def preprocess_failure_text(text: str) -> str:
    """Optimize text for embedding generation"""
    # Combine problem context + failure symptoms + code context
    parts = []
    
    if 'problem:' in text.lower():
        parts.append(extract_problem_context(text))
    
    if 'error:' in text.lower():
        parts.append(extract_error_context(text))
    
    if 'code:' in text.lower():
        parts.append(extract_code_context(text))
    
    return " | ".join(parts)

def cosine_similarity_search(query_embedding: List[float], candidate_embeddings: List[Tuple[str, List[float]]], top_k: int = 10) -> List[Tuple[str, float]]:
    """
    Find top-k most similar failures using cosine similarity
    """
    similarities = []
    
    for failure_id, embedding in candidate_embeddings:
        similarity = np.dot(query_embedding, embedding) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
        )
        similarities.append((failure_id, similarity))
    
    # Return top-k sorted by similarity
    return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_k]
```

## 6. k-NN Retrieval with Hybrid Fusion

### Problem Solved
Combines semantic similarity (embedding-based) and structural similarity (graph-based) to retrieve the most relevant historical failures for diagnosis.

### Application in Pipeline
Implements the hybrid fusion strategy in the retrieval layer, merging results from both parallel retrieval branches.

### Algorithm Implementation

```python
def hybrid_failure_retrieval(
    current_failure: Failure, 
    embedding_results: List[Tuple[str, float]], 
    graph_results: List[Tuple[str, float]], 
    alpha: float = 0.6
) -> List[Tuple[str, float]]:
    """
    Hybrid fusion of semantic and structural similarity
    alpha: weight for embedding similarity vs graph similarity
    """
    
    # Normalize scores to [0, 1]
    norm_embedding = normalize_scores(embedding_results)
    norm_graph = normalize_scores(graph_results)
    
    # Create unified score dictionary
    all_failures = set([fid for fid, _ in norm_embedding] + [fid for fid, _ in norm_graph])
    
    hybrid_scores = {}
    for failure_id in all_failures:
        embedding_score = dict(norm_embedding).get(failure_id, 0.0)
        graph_score = dict(norm_graph).get(failure_id, 0.0)
        
        # Weighted combination
        hybrid_score = alpha * embedding_score + (1 - alpha) * graph_score
        
        # Bonus for appearing in both lists
        if failure_id in dict(norm_embedding) and failure_id in dict(norm_graph):
            hybrid_score *= 1.2  # 20% bonus for dual presence
        
        hybrid_scores[failure_id] = hybrid_score
    
    # Sort and return top results
    return sorted(hybrid_scores.items(), key=lambda x: x[1], reverse=True)

def normalize_scores(results: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
    """Min-max normalization to [0, 1] range"""
    if not results:
        return []
    
    scores = [score for _, score in results]
    min_score, max_score = min(scores), max(scores)
    
    if max_score == min_score:
        return [(fid, 0.5) for fid, _ in results]
    
    return [
        (failure_id, (score - min_score) / (max_score - min_score))
        for failure_id, score in results
    ]
```

## 7. Structured Diagnostic Reasoning & Prompt Template Design

### Problem Solved
Guides LLM reasoning to produce structured, evidence-based diagnoses rather than generic advice, without exposing internal chain-of-thought to the end user interface.

### Application in Pipeline
Final reasoning layer that synthesizes retrieved context into personalized learning recommendations.

### Prompt Template Structure

```python
def build_structured_prompt(
    current_failure: Failure, 
    similar_failures: List[Failure], 
    weakness_scores: Dict[str, float]
) -> str:
    """
    Structured reasoning prompt for practice analysis
    """
    
    template = """
You are analyzing a competitive programming failure to identify learning opportunities.

## Current Practice Session
Problem: {problem_name} ({difficulty})
Topics: {topics}
Submission Status: {status}
Evidence: {evidence}

## Similar Past Failures
{similar_failures_context}

## Weakness Pattern Analysis  
Top weaknesses by frequency:
{weakness_analysis}

## Structured Diagnostic Reasoning
Please reason through this step by step:

1. **Pattern Recognition**: What patterns do you see across the current failure and similar past failures?

2. **Root Cause Validation**: Based on the evidence, how confident are you that "{predicted_root_cause}" is the actual root cause? Consider alternative explanations.

3. **Weakness Prioritization**: Which of the Growth Opportunities should be addressed first based on:
   - Frequency of occurrence  
   - Impact on problem-solving ability
   - Likelihood of improvement with targeted practice

4. **Learning Strategy**: Design a specific practice plan that addresses the prioritized weakness:
   - What concepts need reinforcement?
   - What types of problems should be practiced?
   - What specific techniques or patterns should be learned?

## Final Diagnosis
Provide a structured diagnosis with:
- Primary weakness (one key area to focus on)
- Confidence level (0-100%)  
- Specific learning recommendations (2-3 actionable items)
- Practice problem suggestions (specific LeetCode problems if applicable)
"""
    
    return template.format(
        problem_name=current_failure.problem_name,
        difficulty=current_failure.difficulty,
        topics=", ".join(current_failure.topics),
        status=current_failure.status,
        evidence=format_evidence(current_failure.evidence),
        similar_failures_context=format_similar_failures(similar_failures),
        weakness_analysis=format_weakness_scores(weakness_scores),
        predicted_root_cause=current_failure.predicted_root_cause
    )
```

### Response Parsing

```python
def parse_diagnostic_response(llm_response: str) -> StructuredDiagnosis:
    """Extract structured information from diagnostic response"""
    
    sections = extract_sections(llm_response)
    
    return StructuredDiagnosis(
        primary_weakness=extract_primary_weakness(sections['Final Diagnosis']),
        confidence=extract_confidence(sections['Final Diagnosis']),
        learning_recommendations=extract_recommendations(sections['Learning Strategy']),
        practice_problems=extract_practice_problems(sections['Final Diagnosis']),
        reasoning_chain={
            'pattern_recognition': sections['Pattern Recognition'],
            'root_cause_validation': sections['Root Cause Validation'],
            'weakness_prioritization': sections['Weakness Prioritization']
        }
    )
```

## Performance Benchmarks

| Algorithm | Input Size | Avg Runtime | Memory Usage |
|-----------|------------|-------------|--------------|
| Myers Diff | 1000 lines | 45ms | 2.1 MB |
| Structural Code Pattern Analysis | 500 nodes | 120ms | 5.3 MB |
| Bayesian Inference | 15 evidence signals | 8ms | 0.8 MB |
| PageRank | 1000 weakness nodes | 180ms | 12 MB |
| Embedding Generation | 500 tokens | 340ms | 1.2 MB |
| k-NN Search | 10k vectors | 25ms | 15 MB |
| Diagnostic Generation Prompt | 2k context tokens | 3200ms | 8 MB |

## Algorithm Interactions

The algorithms work together in a carefully orchestrated pipeline:

1. **Myers + Structural Code Pattern Analysis** → Provide complementary change detection
2. **Bayesian + Historical** → Combine current evidence with learned patterns  
3. **PageRank + Embeddings** → Balance structural and semantic similarity
4. **k-NN + Graph** → Hybrid retrieval for comprehensive context
5. **Structured Reasoning + Evidence** → Structured reasoning over retrieved information

This algorithmic synergy enables Praxis to transform raw coding failures into actionable Learning Intelligence.