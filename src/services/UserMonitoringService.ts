import { EmotionalState, MonitoringStats, EngagementLevel, FrustrationLevel } from '../types';

export class UserMonitoringService {
  private static currentEmotionalState: EmotionalState | null = null;
  private static monitoringStats: MonitoringStats = {
    totalReadings: 0,
    highConfidenceReadings: 0,
    engagementScore: 0.5,
    emotionDistribution: {},
  };

  static resetSession() {
    this.currentEmotionalState = null;
    this.monitoringStats = {
      totalReadings: 0,
      highConfidenceReadings: 0,
      engagementScore: 0.5,
      emotionDistribution: {},
    };
  }

  static recordEmotion(emotion: string, confidence: number) {
    const normalized = emotion.toLowerCase();
    this.currentEmotionalState = {
      primary: normalized,
      intensity: confidence,
      confidence,
    };

    const stats = this.monitoringStats;
    stats.totalReadings += 1;
    stats.emotionDistribution[normalized] = (stats.emotionDistribution[normalized] || 0) + 1;

    if (confidence > 0.8) {
      stats.highConfidenceReadings += 1;
    }

    if (['happy', 'surprised', 'neutral'].includes(normalized)) {
      stats.engagementScore = Math.min(1, stats.engagementScore + 0.05);
    } else if (['sad', 'angry', 'fear'].includes(normalized)) {
      stats.engagementScore = Math.max(0, stats.engagementScore - 0.05);
    }
  }

  static getCurrentEmotionalState(): EmotionalState | null {
    return this.currentEmotionalState;
  }

  static getMonitoringStats(): MonitoringStats {
    return this.monitoringStats;
  }

  static getEngagementLevel(): EngagementLevel {
    if (this.monitoringStats.engagementScore > 0.7) return 'high';
    if (this.monitoringStats.engagementScore > 0.4) return 'moderate';
    return 'low';
  }

  static getFrustrationLevel(): FrustrationLevel {
    const negativeCount = ['angry', 'sad', 'fear'].reduce((count, emotion) => {
      return count + (this.monitoringStats.emotionDistribution[emotion] || 0);
    }, 0);

    if (this.monitoringStats.totalReadings === 0) return 'low';
    const ratio = negativeCount / this.monitoringStats.totalReadings;

    if (ratio > 0.6) return 'high';
    if (ratio > 0.3) return 'moderate';
    return 'low';
  }
}
