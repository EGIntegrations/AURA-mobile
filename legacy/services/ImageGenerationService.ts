import { GameQuestion } from '../types';
import { OpenAIService } from './OpenAIService';

export class ImageGenerationService {
  private static cache: Record<string, string[]> = {};

  static async generateImagesForEmotion(emotion: string, count: number = 3): Promise<GameQuestion[]> {
    const normalized = emotion.toLowerCase();
    const cached = this.cache[normalized] || [];
    const needed = Math.max(0, count - cached.length);

    if (needed > 0) {
      const generated = await OpenAIService.generateEmotionImages(emotion, needed);
      this.cache[normalized] = [...cached, ...generated];
    }

    return (this.cache[normalized] || []).slice(0, count).map((imageData, index) => ({
      id: `${emotion}-generated-${index}`,
      correctEmotion: emotion,
      imageData,
    }));
  }

  static async generateSafePersonImages(
    baseFaceBase64: string,
    emotion: string,
    count: number = 3
  ): Promise<GameQuestion[]> {
    const results = await OpenAIService.generateSafePersonEmotions(baseFaceBase64, [emotion]);
    const imageData = results[emotion];
    if (!imageData) return [];

    return Array.from({ length: count }, (_, index) => ({
      id: `${emotion}-safe-person-${index}`,
      correctEmotion: emotion,
      imageData,
    }));
  }
}
