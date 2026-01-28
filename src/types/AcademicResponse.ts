/**
 * Academic Response Format
 * Enforces strict academic structure: Partie → Énoncé → Étapes → Conclusion
 */

export interface AcademicStep {
  title: string;
  explanation: string;
  equations?: string[]; // LaTeX strings
}

export interface AcademicResponse {
  partie: string;
  problemStatement: string;
  steps: AcademicStep[];
  conclusion?: string;
}
