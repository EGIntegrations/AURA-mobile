import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export class AudioService {
  private static soundInstance: Audio.Sound | null = null;

  static async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }

  static async playFeedback(isCorrect: boolean, emotion: string): Promise<void> {
    // Speak the feedback with appropriate tone
    const message = isCorrect
      ? `Correct! ${emotion}`
      : `Not quite. The answer was ${emotion}`;

    // Adjust pitch based on correctness for audio cue
    await this.speak(message, {
      pitch: isCorrect ? 1.2 : 0.8,
      rate: 0.9,
    });
  }

  static async speak(text: string, options?: Speech.SpeechOptions): Promise<void> {
    await Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      ...options,
    });
  }

  static async stopSpeaking(): Promise<void> {
    await Speech.stop();
    if (this.soundInstance) {
      await this.soundInstance.stopAsync();
      await this.soundInstance.unloadAsync();
      this.soundInstance = null;
    }
  }

  static async playSound(audioUri: string): Promise<void> {
    if (this.soundInstance) {
      await this.soundInstance.unloadAsync();
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true }
    );
    this.soundInstance = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  }

  static async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }
}
