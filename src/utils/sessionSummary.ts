import { ScoreSummary } from '../types';

export function buildScoreSummary(score: number, previousScore?: number | null): ScoreSummary {
  const baseline = typeof previousScore === 'number' ? previousScore : null;
  return {
    score,
    previousScore: baseline,
    improvement: baseline === null ? 0 : score - baseline,
  };
}

export function formatImprovementText(improvement: number): string {
  if (improvement > 0) return `+${improvement} vs last session`;
  if (improvement < 0) return `${improvement} vs last session`;
  return 'No change vs last session';
}
