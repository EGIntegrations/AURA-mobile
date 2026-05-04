import { GameQuestion, PlayerProgress, GameSession } from '../types';
import { ImageDatasetService } from './ImageDatasetService';

export class CurriculumEngine {
  private questionQueue: GameQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private sessionStartTime: Date | null = null;
  private sessionAnswers: Array<{ isCorrect: boolean; responseTime: number }> = [];

  /**
   * Generate a balanced question queue based on player level
   */
  generateQuestionQueue(progress: PlayerProgress, questionsCount: number = 8): GameQuestion[] {
    const unlockedEmotions = this.getUnlockedEmotions(progress.currentLevel);
    const allQuestions: GameQuestion[] = [];

    // Load questions for each unlocked emotion
    unlockedEmotions.forEach(emotion => {
      const emotionQuestions = ImageDatasetService.loadImagesForEmotion(emotion);
      allQuestions.push(...emotionQuestions);
    });

    // Shuffle and select required number
    const shuffled = this.shuffleArray(allQuestions);
    this.questionQueue = shuffled.slice(0, questionsCount);
    this.currentQuestionIndex = 0;
    this.sessionStartTime = new Date();
    this.sessionAnswers = [];

    return this.questionQueue;
  }

  /**
   * Get the next question in the queue
   */
  nextQuestion(): GameQuestion | null {
    if (this.currentQuestionIndex >= this.questionQueue.length) {
      return null;
    }

    const question = this.questionQueue[this.currentQuestionIndex];
    this.currentQuestionIndex++;
    return question;
  }

  /**
   * Record an answer for the current session
   */
  recordAnswer(isCorrect: boolean, responseTime: number) {
    this.sessionAnswers.push({ isCorrect, responseTime });
  }

  /**
   * Complete the session and return a GameSession object
   */
  completeSession(finalScore: number, maxStreak: number): GameSession {
    const endTime = new Date();
    const correctCount = this.sessionAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = this.sessionAnswers.length;
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

    const avgResponseTime = this.sessionAnswers.length > 0
      ? this.sessionAnswers.reduce((sum, a) => sum + a.responseTime, 0) / this.sessionAnswers.length
      : 0;

    const session: GameSession = {
      id: `session-${Date.now()}`,
      startTime: this.sessionStartTime || new Date(),
      endTime,
      score: finalScore,
      questionsAnswered: totalQuestions,
      correctAnswers: correctCount,
      currentStreak: 0,
      maxStreak,
      accuracy,
      averageResponseTime: avgResponseTime,
    };

    return session;
  }

  /**
   * Get unlocked emotions based on player level
   */
  private getUnlockedEmotions(level: number): string[] {
    if (level === 1) {
      return ['Happy', 'Sad', 'Neutral'];
    } else if (level === 2) {
      return ['Happy', 'Sad', 'Neutral', 'Surprised'];
    } else if (level === 3) {
      return ['Happy', 'Sad', 'Neutral', 'Surprised', 'Angry'];
    } else {
      return ['Happy', 'Sad', 'Neutral', 'Surprised', 'Angry', 'Fear'];
    }
  }

  /**
   * Calculate XP required for a given level
   */
  static getXPForLevel(level: number): number {
    return level * 1000;
  }

  /**
   * Calculate level from total XP
   */
  static getLevelFromXP(xp: number): number {
    return Math.floor(xp / 1000) + 1;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Reset the curriculum engine
   */
  reset() {
    this.questionQueue = [];
    this.currentQuestionIndex = 0;
    this.sessionStartTime = null;
    this.sessionAnswers = [];
  }

  /**
   * Get current session stats
   */
  getSessionStats() {
    const correctCount = this.sessionAnswers.filter(a => a.isCorrect).length;
    const accuracy = this.sessionAnswers.length > 0
      ? correctCount / this.sessionAnswers.length
      : 0;

    return {
      questionsAnswered: this.sessionAnswers.length,
      correctAnswers: correctCount,
      accuracy,
    };
  }
}
