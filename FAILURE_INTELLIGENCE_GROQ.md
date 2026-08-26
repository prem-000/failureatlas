# Praxis — Groq Integration & Synthesizer Architecture

A specification of the exact role, constraints, prompt architecture, and validation pipeline governing Groq inside the Praxis Failure Intelligence Engine.

---

## 1. Groq's Exact Role

$$\text{Static Evidence} + \text{Problem Contract} + \text{Test Objective} + \text{Deterministic Context} \longrightarrow \textbf{Groq} \longrightarrow \text{Candidate Inputs Only}$$

### What Groq DOES:
- Synthesizes candidate inputs for complex multi-condition interactions and minimal counterexamples.
- Operates under strict constraint of the Canonical Problem Contract.

### What Groq NEVER Does:
- Never decides whether user code is correct or incorrect.
- Never generates expected outputs (evaluated exclusively by Reference Oracles).
- Never calculates health scores or risk percentages.
- Never invents parameters or input formats not defined in the Problem Contract.

---

## 2. Strict 12-Rule System Prompt Architecture

```text
You are a constrained test-case synthesizer.

Your task is to generate candidate inputs designed to verify a specific hypothesis about submitted algorithmic code.

You must follow the provided Problem Contract exactly.

Rules:
1. Never invent parameters.
2. Never change parameter names.
3. Never violate parameter types.
4. Never violate stated constraints.
5. Generate inputs only, not explanations or markdown.
6. Do not generate generic/random test cases.
7. Each test must target the provided hypothesis.
8. Prefer minimal counterexamples.
9. Prefer combinations of conditions that deterministic generators may not naturally produce.
10. Do not assume the submitted code is correct.
11. Do not use the submitted code as the source of expected output.
12. Return strict JSON matching the required schema.
```

---

## 3. Structured Input Schema Sent to Groq

```json
{
  "problemContract": {
    "functionName": "moveZeroes",
    "parameters": [
      { "name": "nums", "type": "number[]" }
    ],
    "returnType": "void",
    "executionMode": "in_place",
    "constraints": ["1 <= nums.length <= 10000"],
    "invariants": ["Relative order of non-zero elements is preserved"]
  },
  "evidence": {
    "detector": "IN_PLACE_MUTATION_INDEX_RULE",
    "sourceLineStart": 5,
    "sourceSnippet": "nums.splice(i, 1);",
    "finding": "In-place .splice() alters array length without index decrement.",
    "hypothesis": "Consecutive zeroes shift indices and skip processing."
  },
  "testObjective": {
    "objective": "Construct inputs with consecutive target values to expose pointer skipping.",
    "requiredCharacteristics": ["consecutive_zeroes", "trailing_zeroes"],
    "priority": "high"
  },
  "deterministicTestsAlreadyGenerated": [
    { "nums": [0, 0, 1] },
    { "nums": [0, 0, 0] }
  ],
  "submittedCodeSnippet": "function moveZeroes(nums) { ... }"
}
```

---

## 4. Structured Output Schema Expected from Groq

```json
{
  "candidates": [
    {
      "input": {
        "nums": [1, 0, 0, 2]
      },
      "reason": "Minimal input with consecutive zeroes sandwiched between valid values to test pointer index progression."
    }
  ]
}
```

---

## 5. Candidate Validation & Selection Pipeline

Before any Groq candidate can enter the execution queue:

1. **Schema & JSON Check**: Enforces JSON compliance.
2. **Contract Validator**: Rejects candidate if any parameter name is missing, extra, or of invalid type.
3. **Deduplication**: Rejects if candidate input is identical to existing deterministic test cases.
4. **5-Factor Quality Scoring**:
   - $35\%$ Evidence Alignment (matches required characteristic)
   - $20\%$ Constraint Relevance
   - $15\%$ Minimality (prefers smaller, clean counterexamples)
   - $20\%$ Behavioral Differentiation
   - $10\%$ Novelty
5. **Reference Oracle Evaluation**: Evaluates ground truth `expectedOutput` using independent reference algorithms before execution.
