import { Asset } from 'expo-asset';
import { GameQuestion } from '../types';

export class ImageDatasetService {
  private static readonly emotionImages: Record<string, any[]> = {
    happy: [
      require('../assets/emotions/happy.png'),
    ],
    sad: [
      require('../assets/emotions/sad.png'),
    ],
    angry: [
      require('../assets/emotions/angry.png'),
    ],
    surprised: [
      require('../assets/emotions/surprised.png'),
    ],
    fear: [
      require('../assets/emotions/fear.png'),
    ],
    neutral: [
      require('../assets/emotions/neutral.png'),
    ],
  };

  static loadImagesForEmotion(emotion: string): GameQuestion[] {
    const emotionKey = emotion.toLowerCase();
    const images = this.emotionImages[emotionKey] || [];
    const minimumPerEmotion = 4;

    if (images.length === 0) {
      // Return a placeholder question if no images available
      return [{
        id: `${emotion}-placeholder`,
        correctEmotion: emotion,
        imageData: undefined,
      }];
    }

    const questions = images.map((img, index) => ({
      id: `${emotion}-${index}`,
      correctEmotion: emotion,
      imageData: Asset.fromModule(img).uri,
    }));

    let duplicateIndex = questions.length;
    while (questions.length < minimumPerEmotion) {
      const source = questions[duplicateIndex % questions.length];
      questions.push({
        ...source,
        id: `${emotion}-repeat-${duplicateIndex}`,
      });
      duplicateIndex += 1;
    }

    return questions;
  }

  static getSupportedEmotions(): string[] {
    return Object.keys(this.emotionImages).map(e =>
      e.charAt(0).toUpperCase() + e.slice(1)
    );
  }

  static getAllQuestions(): GameQuestion[] {
    const allQuestions: GameQuestion[] = [];
    this.getSupportedEmotions().forEach(emotion => {
      const questions = this.loadImagesForEmotion(emotion);
      allQuestions.push(...questions);
    });
    return allQuestions;
  }
}
