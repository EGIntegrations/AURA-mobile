import { OpenAIService } from './OpenAIService';
import { ElevenLabsService } from './ElevenLabsService';
import { AudioService } from './AudioService';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  emotionalTone?: 'supportive' | 'encouraging' | 'corrective' | 'neutral';
}

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  topic: string;
  goal: string;
  difficulty: number;
  quickResponses: string[];
}

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [
  {
    id: '1',
    title: 'Social Greeting',
    description: 'Learn appropriate ways to greet others',
    topic: 'social_greeting',
    goal: 'Practice greeting people in different situations',
    difficulty: 1,
    quickResponses: [
      'Hi, how are you?',
      'Good morning!',
      'Nice to meet you',
      'Have a great day!',
    ],
  },
  {
    id: '2',
    title: 'Asking for Help',
    description: 'Learn to ask for help when needed',
    topic: 'asking_help',
    goal: 'Practice asking for assistance politely',
    difficulty: 2,
    quickResponses: [
      'Can you help me?',
      'I need assistance with...',
      'Could you please explain?',
      'Thank you for your help',
    ],
  },
  {
    id: '3',
    title: 'Expressing Feelings',
    description: 'Learn to express feelings appropriately',
    topic: 'expressing_feelings',
    goal: 'Practice sharing emotions in a healthy way',
    difficulty: 3,
    quickResponses: [
      'I feel happy when...',
      'I am frustrated because...',
      'This makes me feel...',
      'I appreciate that',
    ],
  },
  {
    id: '4',
    title: 'Daily Activities',
    description: 'Learn to discuss daily activities',
    topic: 'daily_activities',
    goal: 'Practice talking about routine and activities',
    difficulty: 1,
    quickResponses: [
      'Today I did...',
      'I enjoy...',
      'My favorite activity is...',
      'What do you like to do?',
    ],
  },
];

export class ConversationService {
  private messages: ConversationMessage[] = [];
  private currentScenario: ConversationScenario | null = null;
  private startTime: Date | null = null;
  private isListening: boolean = false;

  async startConversation(scenario: ConversationScenario): Promise<ConversationMessage> {
    this.currentScenario = scenario;
    this.messages = [];
    this.startTime = new Date();

    // Generate opening message
    const openingText = await this.generateOpeningMessage(scenario);

    const openingMessage: ConversationMessage = {
      id: this.generateMessageId(),
      content: openingText,
      sender: 'assistant',
      timestamp: new Date(),
      emotionalTone: 'supportive',
    };

    this.messages.push(openingMessage);

    // Play opening message via audio
    try {
      const audioUri = await ElevenLabsService.synthesizeSpeech(openingText, 'supportive');
      await AudioService.playSound(audioUri);
    } catch (error) {
      // Fallback to system TTS
      await AudioService.speak(openingText);
    }

    return openingMessage;
  }

  async processUserMessage(userInput: string): Promise<ConversationMessage> {
    // Add user message
    const userMessage: ConversationMessage = {
      id: this.generateMessageId(),
      content: userInput,
      sender: 'user',
      timestamp: new Date(),
    };
    this.messages.push(userMessage);

    // Generate AI response
    const conversationHistory = this.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    const systemPrompt = this.buildSystemPrompt();
    const aiResponseText = await OpenAIService.chat(
      [{ role: 'system', content: systemPrompt }, ...conversationHistory],
      150
    );

    // Determine emotional tone
    const tone = this.determineEmotionalTone(aiResponseText);

    const assistantMessage: ConversationMessage = {
      id: this.generateMessageId(),
      content: aiResponseText,
      sender: 'assistant',
      timestamp: new Date(),
      emotionalTone: tone,
    };
    this.messages.push(assistantMessage);

    // Play response
    try {
      const audioUri = await ElevenLabsService.synthesizeSpeech(aiResponseText, tone);
      await AudioService.playSound(audioUri);
    } catch (error) {
      await AudioService.speak(aiResponseText);
    }

    return assistantMessage;
  }

  async endConversation(): Promise<{
    duration: number;
    messageCount: number;
    highlights: string;
    recommendations: string;
  }> {
    const endTime = new Date();
    const duration = this.startTime
      ? Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000)
      : 0;

    const summary = await this.generateConversationSummary();

    return {
      duration,
      messageCount: this.messages.length,
      highlights: summary.highlights,
      recommendations: summary.recommendations,
    };
  }

  getMessages(): ConversationMessage[] {
    return this.messages;
  }

  getCurrentScenario(): ConversationScenario | null {
    return this.currentScenario;
  }

  private buildSystemPrompt(): string {
    if (!this.currentScenario) {
      return 'You are a supportive AI coach helping someone practice social conversations.';
    }

    return `You are AURA Coach, a friendly and supportive AI assistant helping someone practice social skills.

Current Scenario: ${this.currentScenario.title}
Topic: ${this.currentScenario.topic}
Goal: ${this.currentScenario.goal}
Description: ${this.currentScenario.description}

Your role:
- Provide natural, conversational responses
- Be encouraging and supportive
- Gently correct mistakes when needed
- Ask follow-up questions to keep the conversation going
- Stay on topic related to the scenario
- Keep responses concise (2-3 sentences maximum)
- Use simple, clear language
- Show empathy and understanding

Remember: You're helping someone practice social interactions in a safe, judgment-free environment.`;
  }

  private async generateOpeningMessage(scenario: ConversationScenario): Promise<string> {
    const greetings = {
      social_greeting: "Hi there! I'm so glad you're here to practice greetings with me. Let's start with a simple hello - how would you greet someone you just met?",
      asking_help: "Hello! Today we're going to practice asking for help. Remember, asking for help is a sign of strength, not weakness. What's something you might need help with?",
      expressing_feelings: "Hi! I'm here to help you practice expressing your feelings. It's important to share how we feel. Can you tell me about something that made you happy recently?",
      daily_activities: "Hey! Let's talk about our daily activities. I love hearing about what people do in their day. What did you do today that you enjoyed?",
    };

    return greetings[scenario.topic as keyof typeof greetings] || greetings.social_greeting;
  }

  private determineEmotionalTone(text: string): 'supportive' | 'encouraging' | 'corrective' | 'neutral' {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('great job') ||
      lowerText.includes('excellent') ||
      lowerText.includes('wonderful')
    ) {
      return 'encouraging';
    }

    if (
      lowerText.includes('try') ||
      lowerText.includes('instead') ||
      lowerText.includes('better to')
    ) {
      return 'corrective';
    }

    if (
      lowerText.includes('understand') ||
      lowerText.includes('that\'s okay') ||
      lowerText.includes('it\'s normal')
    ) {
      return 'supportive';
    }

    return 'neutral';
  }

  private async generateConversationSummary(): Promise<{
    highlights: string;
    recommendations: string;
  }> {
    const conversationText = this.messages
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');

    const summaryPrompt = `Based on this conversation practice session, provide:
1. A brief highlight (1-2 sentences) of what went well
2. A recommendation (1-2 sentences) for future practice

Conversation:
${conversationText}

Format your response as JSON:
{
  "highlights": "...",
  "recommendations": "..."
}`;

    try {
      const response = await OpenAIService.chat([
        { role: 'system', content: 'You are analyzing a social skills practice conversation.' },
        { role: 'user', content: summaryPrompt },
      ], 200);

      const parsed = JSON.parse(response);
      return {
        highlights: parsed.highlights || 'Great conversation practice!',
        recommendations: parsed.recommendations || 'Keep practicing regularly!',
      };
    } catch (error) {
      return {
        highlights: 'You engaged well in the conversation and stayed on topic.',
        recommendations: 'Continue practicing to build confidence in social situations.',
      };
    }
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  startListening() {
    this.isListening = true;
  }

  stopListening() {
    this.isListening = false;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}
