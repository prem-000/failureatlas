/**
 * Topic Registry
 *
 * Categorized topic arrays that power autocomplete search and
 * automatic category detection for the Learning Sheets module.
 */

import type { SheetCategory } from '@/types/learning-sheet';

// ─── Registry Data ────────────────────────────────────────────────────────────

export const TOPIC_REGISTRY: Record<SheetCategory, string[]> = {
  dsa: [
    'Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Hash Maps', 'Hash Sets',
    'Trees', 'Binary Trees', 'Binary Search Trees', 'AVL Trees', 'Red-Black Trees',
    'Heaps', 'Priority Queues', 'Tries', 'Segment Trees', 'Fenwick Trees',
    'Binary Search', 'Sorting', 'Merge Sort', 'Quick Sort', 'Counting Sort',
    'Graphs', 'BFS', 'DFS', 'Dijkstra', 'Bellman-Ford', 'Floyd-Warshall',
    'Topological Sort', 'Union Find', 'Kruskal', 'Prim',
    'Dynamic Programming', 'Memoization', 'Tabulation',
    'Knapsack', 'LCS', 'LIS', 'Matrix Chain Multiplication',
    'Greedy', 'Backtracking', 'Recursion', 'Call Stack',
    'Sliding Window', 'Two Pointers', 'Fast and Slow Pointers',
    'Monotonic Stack', 'Monotonic Queue',
    'Bit Manipulation', 'Math', 'Number Theory', 'Geometry',
    'String Algorithms', 'KMP', 'Rabin-Karp', 'Z-Algorithm',
    'Intervals', 'Matrix', 'Prefix Sum',
  ],
  ml: [
    'Linear Regression', 'Logistic Regression', 'Decision Trees', 'Random Forest',
    'Gradient Boosting', 'XGBoost', 'AdaBoost',
    'Support Vector Machines', 'KNN', 'K-Means Clustering',
    'DBSCAN', 'Hierarchical Clustering', 'PCA',
    'Neural Networks', 'Backpropagation', 'Activation Functions',
    'CNN', 'RNN', 'LSTM', 'GRU',
    'Gradient Descent', 'SGD', 'Adam Optimizer',
    'Regularization', 'L1 L2', 'Dropout', 'Batch Normalization',
    'Cross-Validation', 'Bias-Variance Tradeoff',
    'Feature Engineering', 'Feature Selection',
    'Ensemble Methods', 'Bagging', 'Boosting', 'Stacking',
    'Dimensionality Reduction', 't-SNE', 'UMAP',
    'Naive Bayes', 'Bayesian Networks',
    'Loss Functions', 'Evaluation Metrics',
    'Confusion Matrix', 'ROC Curve', 'AUC',
  ],
  llm: [
    'Transformers', 'Attention Mechanism', 'Self-Attention', 'Multi-Head Attention',
    'BERT', 'GPT', 'T5', 'LLaMA',
    'Tokenization', 'BPE', 'WordPiece', 'SentencePiece',
    'Embeddings', 'Word2Vec', 'GloVe', 'Positional Encoding',
    'Fine-tuning', 'LoRA', 'QLoRA', 'Adapters',
    'RLHF', 'DPO', 'Constitutional AI',
    'RAG', 'Retrieval Augmented Generation',
    'Prompt Engineering', 'Chain of Thought', 'Few-Shot Learning',
    'Context Window', 'KV Cache',
    'Quantization', 'Pruning', 'Distillation',
    'Mixture of Experts', 'Sparse Attention',
    'Evaluation', 'Perplexity', 'BLEU', 'ROUGE',
    'Hallucinations', 'Grounding', 'Guardrails',
    'Vector Databases', 'Semantic Search',
    'Agents', 'Tool Use', 'Function Calling',
  ],
  'system-design': [
    'Load Balancer', 'Reverse Proxy', 'API Gateway',
    'Caching', 'Redis', 'Memcached', 'CDN',
    'Database Sharding', 'Database Replication', 'Read Replicas',
    'CAP Theorem', 'ACID', 'BASE',
    'Consistent Hashing', 'Data Partitioning',
    'Rate Limiter', 'Circuit Breaker', 'Retry Patterns',
    'Message Queue', 'Kafka', 'RabbitMQ', 'SQS',
    'Microservices', 'Monolith', 'Service Mesh',
    'Event-Driven Architecture', 'CQRS', 'Event Sourcing',
    'URL Shortener', 'Chat System', 'News Feed',
    'Notification System', 'Search Engine',
    'Distributed Systems', 'Consensus', 'Raft', 'Paxos',
    'Horizontal Scaling', 'Vertical Scaling',
    'SQL vs NoSQL', 'Database Indexing',
    'WebSockets', 'Long Polling', 'Server-Sent Events',
    'OAuth', 'JWT', 'SSO',
  ],
  os: [
    'Process Management', 'Threads', 'Multithreading',
    'Process Scheduling', 'Round Robin', 'Priority Scheduling',
    'Deadlocks', 'Deadlock Prevention', 'Deadlock Avoidance',
    'Memory Management', 'Paging', 'Segmentation',
    'Virtual Memory', 'Page Replacement', 'TLB',
    'File Systems', 'Inode', 'FAT', 'NTFS',
    'Synchronization', 'Mutex', 'Semaphore', 'Monitor',
    'Inter-Process Communication', 'Pipes', 'Shared Memory',
    'CPU Scheduling', 'Context Switching',
    'System Calls', 'Interrupts',
    'Disk Scheduling', 'RAID',
    'Boot Process', 'Kernel', 'Shell',
  ],
  dbms: [
    'Normalization', '1NF', '2NF', '3NF', 'BCNF',
    'Indexing', 'B-Tree Index', 'Hash Index', 'Bitmap Index',
    'Transactions', 'ACID Properties', 'Isolation Levels',
    'Concurrency Control', 'Locking', 'Two-Phase Locking',
    'SQL Joins', 'Inner Join', 'Outer Join', 'Cross Join',
    'Query Optimization', 'Execution Plans', 'Cost-Based Optimization',
    'ER Model', 'Relational Algebra',
    'Views', 'Stored Procedures', 'Triggers',
    'NoSQL', 'Document Store', 'Key-Value Store', 'Column Family',
    'CAP Theorem', 'Eventual Consistency',
    'Database Recovery', 'Write-Ahead Log',
    'Partitioning', 'Replication', 'Sharding',
  ],
  networks: [
    'OSI Model', 'TCP/IP Model',
    'TCP', 'UDP', 'HTTP', 'HTTPS', 'HTTP/2', 'HTTP/3',
    'DNS', 'DHCP', 'ARP', 'NAT',
    'IP Addressing', 'Subnetting', 'CIDR',
    'Routing', 'BGP', 'OSPF', 'RIP',
    'Switching', 'VLANs', 'STP',
    'TLS/SSL', 'Certificates', 'Handshake',
    'WebSockets', 'gRPC', 'REST',
    'Firewall', 'VPN', 'Proxy',
    'Load Balancing', 'Content Delivery Network',
    'Socket Programming', 'Multiplexing',
  ],
  devops: [
    'Docker', 'Containers', 'Docker Compose',
    'Kubernetes', 'Pods', 'Services', 'Deployments',
    'CI/CD', 'GitHub Actions', 'Jenkins',
    'Infrastructure as Code', 'Terraform', 'Ansible',
    'Monitoring', 'Prometheus', 'Grafana', 'ELK Stack',
    'Logging', 'Tracing', 'Observability',
    'Cloud Services', 'AWS', 'GCP', 'Azure',
    'Serverless', 'Lambda', 'Cloud Functions',
    'Nginx', 'Apache', 'Reverse Proxy',
    'Git', 'Branching Strategies', 'Git Flow',
  ],
  languages: [
    'Python', 'Java', 'C++', 'JavaScript', 'TypeScript',
    'Go', 'Rust', 'C', 'Kotlin', 'Swift',
    'Object-Oriented Programming', 'Functional Programming',
    'Design Patterns', 'Singleton', 'Factory', 'Observer',
    'SOLID Principles', 'DRY', 'KISS',
    'Memory Management', 'Garbage Collection',
    'Concurrency Patterns', 'Async/Await', 'Promises',
    'Generics', 'Interfaces', 'Abstract Classes',
    'Error Handling', 'Exception Handling',
  ],
};

// ─── Flat index for fast lookup ───────────────────────────────────────────────

const topicIndex: Map<string, SheetCategory> = new Map();
for (const [category, topics] of Object.entries(TOPIC_REGISTRY)) {
  for (const topic of topics) {
    topicIndex.set(topic.toLowerCase(), category as SheetCategory);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** All registered topics as a flat list */
export function getAllTopics(): string[] {
  return Object.values(TOPIC_REGISTRY).flat();
}

/**
 * Fuzzy search across all topics. Returns matches sorted by relevance.
 * Matches topic names that contain the query as a substring (case-insensitive).
 */
export function searchTopics(query: string): Array<{ topic: string; category: SheetCategory }> {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: Array<{ topic: string; category: SheetCategory; score: number }> = [];

  for (const [category, topics] of Object.entries(TOPIC_REGISTRY)) {
    for (const topic of topics) {
      const lower = topic.toLowerCase();
      if (lower.includes(q)) {
        // Exact start match scores highest, then exact match, then substring
        const score = lower.startsWith(q) ? 0 : lower === q ? -1 : 1;
        results.push({ topic, category: category as SheetCategory, score });
      }
    }
  }

  return results
    .sort((a, b) => a.score - b.score || a.topic.localeCompare(b.topic))
    .slice(0, 20);
}

/**
 * Detects the category for a given topic string.
 * Falls back to 'dsa' if no match is found.
 */
export function getCategoryForTopic(topic: string): SheetCategory {
  // Exact match first
  const exact = topicIndex.get(topic.toLowerCase());
  if (exact) return exact;

  // Partial match — find the category where the topic appears as a substring
  const q = topic.toLowerCase();
  for (const [category, topics] of Object.entries(TOPIC_REGISTRY)) {
    for (const t of topics) {
      if (t.toLowerCase().includes(q) || q.includes(t.toLowerCase())) {
        return category as SheetCategory;
      }
    }
  }

  return 'dsa'; // default
}

/**
 * Generates a URL-safe slug from a topic string.
 */
export function slugifyTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
