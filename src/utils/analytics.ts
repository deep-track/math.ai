import type { AnalyticsEvent } from '../types';

class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private sessionStartTime = Date.now();

  recordEvent(event: AnalyticsEvent) {
    this.events.push(event);
    // In development, log events
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event);
    }
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      problemsSubmitted: this.events.filter(e => e.eventType === 'problem_submitted').length,
      tutorModeTriggers: this.events.filter(e => e.eventType === 'tutor_mode_triggered').length,
      feedbackSubmissions: this.events.filter(e => e.eventType === 'feedback_submitted').length,
      averageResponseTime: this.getAverageResponseTime(),
      sessionDuration: Date.now() - this.sessionStartTime,
    };
  }

  private getAverageResponseTime(): number {
    const responseEvents = this.events.filter(
      e => e.eventType === 'response_received' && e.responseTime
    );
    if (responseEvents.length === 0) return 0;
    const total = responseEvents.reduce((sum, e) => sum + (e.responseTime || 0), 0);
    return Math.round(total / responseEvents.length);
  }

  exportStats() {
    const stats = this.getStats();
    console.table(stats);
    return stats;
  }

  clearEvents() {
    this.events = [];
  }
}

export const analyticsTracker = new AnalyticsTracker();
