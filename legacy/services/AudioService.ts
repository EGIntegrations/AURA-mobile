import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Logger } from './Logger';

type SfxKey = 'correct' | 'incorrect' | 'roundComplete' | 'sessionComplete';

export class AudioService {
  private static soundInstance: Audio.Sound | null = null;
  private static effectSounds: Partial<Record<SfxKey, Audio.Sound>> = {};
  private static activeEffect: Audio.Sound | null = null;
  private static playbackToken = 0;
  private static lastEffectKey: SfxKey | null = null;
  private static lastEffectAt = 0;

  private static readonly SFX_SOURCES: Record<SfxKey, any> = {
    correct: require('../assets/sfx/correct.wav'),
    incorrect: require('../assets/sfx/incorrect.wav'),
    roundComplete: require('../assets/sfx/round-complete.wav'),
    sessionComplete: require('../assets/sfx/session-complete.wav'),
  };

  static async initialize(): Promise<void> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    await this.preloadEffects();
  }

  static async preloadEffects(): Promise<void> {
    const entries = Object.entries(this.SFX_SOURCES) as Array<[SfxKey, any]>;
    await Promise.all(
      entries.map(async ([key, source]) => {
        if (this.effectSounds[key]) return;
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish && this.activeEffect === sound) {
            this.activeEffect = null;
          }
        });
        this.effectSounds[key] = sound;
      })
    );
  }

  static async unloadEffects(): Promise<void> {
    const sounds = Object.values(this.effectSounds).filter(Boolean) as Audio.Sound[];
    await Promise.all(
      sounds.map(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          Logger.warn('Effect sound unload failed', Logger.fromError(error));
        }
      })
    );
    this.effectSounds = {};
    this.activeEffect = null;
  }

  static async playFeedback(
    isCorrect: boolean,
    emotion: string,
    options?: { speak?: boolean }
  ): Promise<void> {
    await this.playEffect(isCorrect ? 'correct' : 'incorrect');
    if (!options?.speak) return;

    const message = isCorrect
      ? `Correct! ${emotion}`
      : `Not quite. The answer was ${emotion}`;

    await this.speak(message, {
      pitch: isCorrect ? 1.2 : 0.8,
      rate: 0.9,
    });
  }

  static async playRoundComplete(): Promise<void> {
    await this.playEffect('roundComplete');
  }

  static async playSessionComplete(): Promise<void> {
    await this.playEffect('sessionComplete');
  }

  static async playEffect(key: SfxKey): Promise<void> {
    const now = Date.now();
    if (this.lastEffectKey === key && now - this.lastEffectAt < 120) {
      return;
    }
    this.lastEffectKey = key;
    this.lastEffectAt = now;

    if (!this.effectSounds[key]) {
      await this.preloadEffects();
    }

    const sound = this.effectSounds[key];
    if (!sound) return;

    const token = ++this.playbackToken;

    try {
      if (this.activeEffect && this.activeEffect !== sound) {
        const activeStatus = await this.activeEffect.getStatusAsync();
        if (activeStatus.isLoaded && activeStatus.isPlaying) {
          await this.activeEffect.stopAsync();
        }
      }

      const soundStatus = await sound.getStatusAsync();
      if (soundStatus.isLoaded && soundStatus.isPlaying) {
        await sound.stopAsync();
      }
      await sound.setPositionAsync(0);
      if (token === this.playbackToken) {
        this.activeEffect = sound;
        await sound.playAsync();
      }
    } catch (error) {
      Logger.warn('Effect playback failed', Logger.fromError(error));
    }
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
    if (this.activeEffect) {
      const status = await this.activeEffect.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await this.activeEffect.stopAsync();
      }
      await this.activeEffect.setPositionAsync(0);
      this.activeEffect = null;
    }
  }

  static async playSound(audioUri: string): Promise<void> {
    if (this.soundInstance) {
      try {
        await this.soundInstance.stopAsync();
        await this.soundInstance.unloadAsync();
      } catch (error) {
        Logger.warn('Audio cleanup failed', Logger.fromError(error));
      }
      this.soundInstance = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      this.soundInstance = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch((error) => {
            Logger.warn('Finished sound unload failed', Logger.fromError(error));
          });
          if (this.soundInstance === sound) {
            this.soundInstance = null;
          }
        }
      });
    } catch (error) {
      Logger.warn('Audio playback failed', Logger.fromError(error));
      this.soundInstance = null;
    }
  }

  static async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }
}
