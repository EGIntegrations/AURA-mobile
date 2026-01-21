import axios from 'axios';
import { Buffer } from 'buffer';
import { APIKeyService } from './APIKeyService';
import { BackendClient } from './BackendClient';

export class ElevenLabsService {
  private static readonly BASE_URL = 'https://api.elevenlabs.io/v1';

  // Default voice IDs (can be customized)
  private static readonly VOICE_IDS = {
    supportive: 'EXAVITQu4vr4xnSDxMaL', // Rachel - Warm female
    encouraging: '21m00Tcm4TlvDq8ikWAM', // Rachel variation
    neutral: 'pNInz6obpgDQGcFmaJgB', // Adam - Neutral male
    corrective: 'TxGEqnHWrfWFTfGW9XjX', // Josh - Firm but kind
  };

  static async synthesizeSpeech(
    text: string,
    tone: 'supportive' | 'encouraging' | 'neutral' | 'corrective' = 'neutral'
  ): Promise<string> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<{ audioBase64: string; mimeType?: string }>('/ai/elevenlabs-tts', {
        text,
        tone,
      });
      const mimeType = response.mimeType || 'audio/mpeg';
      return `data:${mimeType};base64,${response.audioBase64}`;
    }

    const apiKey = await APIKeyService.getElevenLabsKey();
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const voiceId = this.VOICE_IDS[tone];

    try {
      const response = await axios.post(
        `${this.BASE_URL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      // Convert to base64 for audio playback
      const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
      return `data:audio/mpeg;base64,${base64Audio}`;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  static async getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<Array<{ voice_id: string; name: string }>>('/ai/elevenlabs-voices');
      return response;
    }

    const apiKey = await APIKeyService.getElevenLabsKey();
    if (!apiKey) return [];

    try {
      const response = await axios.get(`${this.BASE_URL}/voices`, {
        headers: { 'xi-api-key': apiKey },
      });

      return response.data.voices;
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  static async playConversationResponse(
    text: string,
    tone: 'supportive' | 'encouraging' | 'neutral' | 'corrective'
  ): Promise<string> {
    return await this.synthesizeSpeech(text, tone);
  }
}
