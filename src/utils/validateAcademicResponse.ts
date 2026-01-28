/**
 * Validation for Academic Response Format
 * Ensures strict adherence to academic structure
 */

import type { AcademicResponse } from '../types/AcademicResponse';

export function validateAcademicResponse(
  response: AcademicResponse
): { valid: boolean; error?: string } {
  if (!response.partie) {
    return { valid: false, error: 'Missing Partie title' };
  }

  if (!response.problemStatement) {
    return { valid: false, error: 'Missing problem statement' };
  }

  if (!response.steps || response.steps.length === 0) {
    return { valid: false, error: 'At least one step is required' };
  }

  for (const step of response.steps) {
    if (!step.title || !step.explanation) {
      return {
        valid: false,
        error: 'Each step must have a title and explanation',
      };
    }
  }

  return { valid: true };
}
