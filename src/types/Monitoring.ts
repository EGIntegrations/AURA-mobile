export interface EmotionalState {
  primary: string;
  intensity: number;
  confidence: number;
}

export interface MonitoringStats {
  totalReadings: number;
  highConfidenceReadings: number;
  engagementScore: number;
  emotionDistribution: Record<string, number>;
}

export type EngagementLevel = 'low' | 'moderate' | 'high';
export type FrustrationLevel = 'low' | 'moderate' | 'high';
