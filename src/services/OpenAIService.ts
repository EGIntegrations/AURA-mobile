import axios from 'axios';
import { Buffer } from 'buffer';
import { APIKeyService } from './APIKeyService';
import { BackendClient } from './BackendClient';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VisionMessage {
  role: 'user';
  content: Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export class OpenAIService {
  private static async getApiKey(): Promise<string> {
    const key = await APIKeyService.getOpenAIKey();
    if (!key) {
      throw new Error('OpenAI API key not configured');
    }
    return key;
  }

  static async chat(messages: ChatMessage[], maxTokens: number = 500): Promise<string> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<{ message: string }>('/ai/chat', {
        messages,
        maxTokens,
      });
      return response.message;
    }

    const apiKey = await this.getApiKey();

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  static async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<{ message: string }>('/ai/vision', {
        imageBase64,
        prompt,
      });
      return response.message;
    }

    const apiKey = await this.getApiKey();

    const messages: VisionMessage[] = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.2,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  static async textToSpeech(text: string): Promise<string> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<{ audioBase64: string; mimeType?: string }>('/ai/tts', {
        text,
        voice: 'alloy',
      });
      const mimeType = response.mimeType || 'audio/mp3';
      return `data:${mimeType};base64,${response.audioBase64}`;
    }

    const apiKey = await this.getApiKey();

    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    // Convert to base64 for audio playback
    const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
  }

  static async generateEmotionImages(emotion: string, count: number = 1): Promise<string[]> {
    if (BackendClient.isConfigured()) {
      const response = await BackendClient.post<{ images: string[] }>('/ai/image', {
        emotion,
        count,
      });
      return response.images;
    }

    const apiKey = await this.getApiKey();

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'gpt-image-1',
        prompt: `Photorealistic portrait of a person expressing ${emotion}.`,
        size: '1024x1024',
        n: count,
        response_format: 'b64_json',
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.data) return [];
    return response.data.data.map((item: any) => `data:image/png;base64,${item.b64_json}`);
  }

  static async generateSafePersonEmotions(
    baseFaceBase64: string,
    emotions: string[]
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const referenceHint = baseFaceBase64 ? 'Use the same person from a provided reference image.' : '';
    for (const emotion of emotions) {
      const images = await this.generateEmotionImages(
        `Photorealistic portrait of the same person feeling ${emotion}. ${referenceHint}`,
        1
      );
      if (images[0]) {
        results[emotion] = images[0];
      }
    }
    return results;
  }

  static async speechToText(audioUri: string): Promise<string> {
    const apiKey = await this.getApiKey();

    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
    formData.append('model', 'whisper-1');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.text;
  }

  static async generateConversation(
    scenario: string,
    userMessage: string,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = `You are a friendly AI assistant helping someone practice social conversations.
Current scenario: ${scenario}
Be supportive, provide natural responses, and occasionally ask follow-up questions to keep the conversation going.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return await this.chat(messages, 150);
  }
}
