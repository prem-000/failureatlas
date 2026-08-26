/**
 * src/lib/intelligence/contracts/contract-validator.ts
 * Enforces strict compliance with the ProblemContract.
 * Rejects hallucinated parameters, missing required parameters, and invalid types.
 */

import type { ProblemContract } from './problem-contract';

export interface ValidationResult {
  valid: boolean;
  sanitizedInput?: Record<string, unknown>;
  reason?: string;
}

export function validateInputAgainstContract(
  rawInput: unknown,
  contract: ProblemContract
): ValidationResult {
  if (rawInput === null || rawInput === undefined) {
    return { valid: false, reason: 'Input is null or undefined' };
  }

  const expectedParamNames = contract.parameters.map(p => p.name);
  const sanitized: Record<string, unknown> = {};

  // Case 1: Input is already an object with named keys e.g. { nums: [0, 1], target: 9 }
  if (typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    const inputObj = rawInput as Record<string, unknown>;

    // Reject unknown / hallucinated parameters
    for (const key of Object.keys(inputObj)) {
      if (!expectedParamNames.includes(key)) {
        return {
          valid: false,
          reason: `Hallucinated parameter '${key}' not in problem contract [${expectedParamNames.join(', ')}]`,
        };
      }
    }

    // Check all required parameters are present and types match
    for (const param of contract.parameters) {
      if (!(param.name in inputObj)) {
        return {
          valid: false,
          reason: `Missing required parameter '${param.name}' from problem contract`,
        };
      }

      const val = inputObj[param.name];
      if (!isTypeValid(val, param.type)) {
        return {
          valid: false,
          reason: `Parameter '${param.name}' type mismatch. Expected ${param.type}, got ${typeof val}`,
        };
      }

      sanitized[param.name] = val;
    }

    return { valid: true, sanitizedInput: sanitized };
  }

  // Case 2: Input is a single value or positional array for a 1-parameter contract
  if (contract.parameters.length === 1) {
    const param = contract.parameters[0];
    if (isTypeValid(rawInput, param.type)) {
      sanitized[param.name] = rawInput;
      return { valid: true, sanitizedInput: sanitized };
    }
    return {
      valid: false,
      reason: `Single input type mismatch. Expected ${param.type}, got ${typeof rawInput}`,
    };
  }

  // Case 3: Input is an array of positional arguments matching parameter count
  if (Array.isArray(rawInput) && rawInput.length === contract.parameters.length) {
    for (let i = 0; i < contract.parameters.length; i++) {
      const param = contract.parameters[i];
      const val = rawInput[i];
      if (!isTypeValid(val, param.type)) {
        return {
          valid: false,
          reason: `Positional parameter '${param.name}' (index ${i}) type mismatch. Expected ${param.type}`,
        };
      }
      sanitized[param.name] = val;
    }
    return { valid: true, sanitizedInput: sanitized };
  }

  return {
    valid: false,
    reason: `Input shape does not match problem contract with parameters [${expectedParamNames.join(', ')}]`,
  };
}

function isTypeValid(val: unknown, expectedType: string): boolean {
  if (expectedType === 'number[]') {
    return Array.isArray(val) && val.every(x => typeof x === 'number' && !isNaN(x));
  }
  if (expectedType === 'string[]') {
    return Array.isArray(val) && val.every(x => typeof x === 'string');
  }
  if (expectedType === 'number[][]') {
    return Array.isArray(val) && val.every(row => Array.isArray(row) && row.every(x => typeof x === 'number'));
  }
  if (expectedType === 'number') {
    return typeof val === 'number' && !isNaN(val);
  }
  if (expectedType === 'string') {
    return typeof val === 'string';
  }
  if (expectedType === 'boolean') {
    return typeof val === 'boolean';
  }
  return true;
}
