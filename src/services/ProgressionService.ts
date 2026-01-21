import { PlayerProgress } from '../types';
import { CurriculumEngine } from './CurriculumEngine';

export class ProgressionService {
  static applyProgression(progress: PlayerProgress): PlayerProgress {
    const overallAccuracy = progress.totalQuestions > 0
      ? progress.totalCorrectAnswers / progress.totalQuestions
      : 0;

    const currentLevel = CurriculumEngine.getLevelFromXP(progress.totalScore);
    const unlockedEmotions = this.getUnlockedEmotions(currentLevel);
    const achievementsUnlocked = this.computeAchievements({
      ...progress,
      overallAccuracy,
      currentLevel,
      unlockedEmotions,
    });

    return {
      ...progress,
      overallAccuracy,
      currentLevel,
      unlockedEmotions,
      achievementsUnlocked,
    };
  }

  static getUnlockedEmotions(level: number): string[] {
    const base = ['Happy', 'Sad', 'Neutral'];
    if (level >= 2) base.push('Surprised');
    if (level >= 3) base.push('Angry');
    if (level >= 4) base.push('Fear');
    return base;
  }

  private static computeAchievements(progress: PlayerProgress): string[] {
    const achievements = new Set(progress.achievementsUnlocked || []);

    if (progress.totalSessions >= 1) achievements.add('First Session');
    if (progress.totalSessions >= 10) achievements.add('Consistency Champion');
    if (progress.bestStreak >= 5) achievements.add('Streak 5');
    if (progress.bestStreak >= 10) achievements.add('Streak 10');
    if (progress.overallAccuracy >= 0.8) achievements.add('80% Accuracy');
    if (progress.overallAccuracy >= 0.9) achievements.add('90% Accuracy');
    if (progress.speechPracticeHistory.length >= 1) achievements.add('Speech Starter');
    if (progress.speechPracticeHistory.length >= 5) achievements.add('Speech Explorer');
    if (progress.conversationHistory.length >= 1) achievements.add('Conversation Starter');
    if (progress.conversationHistory.length >= 5) achievements.add('Conversation Guide');
    if (progress.mimicryHistory.length >= 1) achievements.add('Mimicry Starter');
    if (progress.mimicryHistory.length >= 5) achievements.add('Mimicry Master');
    if (progress.unlockedEmotions.length >= 6) achievements.add('All Emotions Unlocked');

    return Array.from(achievements);
  }
}
