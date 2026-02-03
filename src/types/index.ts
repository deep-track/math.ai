// Solution and Problem types
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ResponseStatus = 'ok' | 'tutor' | 'refusal' | 'streaming';
export type FeedbackType = 'helpful' | 'incorrect';

export interface Step {
  id: string;
  title: string;
  description: string;
  formula?: string;
}

export interface Source {
  text: string;
  source: string;
  page: string | number;
}

export interface Solution {
  id: string;
  steps: Step[];
  finalAnswer: string;
  confidence: number; // 0-100
  confidenceLevel: ConfidenceLevel;
  status: ResponseStatus;
  tutoringHints?: string[];
  refusalReason?: string;
  timestamp: number;
  content?: string; // Full markdown content for rendering
  sources?: Source[]; // Source references from curriculum
  // If server performs charge during streaming it will set remaining here
  chargedRemaining?: number;
}

export interface Problem {
  id: string;
  content: string;
  submittedAt: number;
  sourceLanguage?: 'en' | 'fr';
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  problem?: Problem;
  solution?: Solution;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Feedback {
  solutionId: string;
  type: FeedbackType;
  timestamp: number;
  additionalComments?: string;
}

export interface ApiError {
  message: string;
  code: string;
  timestamp: number;
}

export interface AnalyticsEvent {
  eventType: 'problem_submitted' | 'tutor_mode_triggered' | 'feedback_submitted' | 'response_received';
  solutionId?: string;
  responseTime?: number;
  timestamp: number;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
}

export interface AnalyticsResponse {
  success: boolean;
}
