import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';
import { useAuthStore } from '../store/authStore';
import { ProgressionService } from '../services/ProgressionService';
import {
  ConversationService,
  ConversationMessage,
  ConversationScenario,
  CONVERSATION_SCENARIOS,
} from '../services/ConversationService';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import { ConversationSummary } from '../types';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export default function ConversationScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [modePickerScenario, setModePickerScenario] = useState<ConversationScenario | null>(null);
  const [conversationMode, setConversationMode] = useState<'text' | 'talk'>('text');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const conversationService = useRef(new ConversationService());
  const scrollViewRef = useRef<ScrollView>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const setupVoice = async () => {
      Voice.onSpeechResults = handleSpeechResults;
      Voice.onSpeechError = handleSpeechError;
      await Audio.requestPermissionsAsync();
    };

    setupVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startScenario = async (scenario: ConversationScenario, mode: 'text' | 'talk') => {
    setSelectedScenario(scenario);
    setConversationMode(mode);
    setMessages([]);
    setInputText('');
    setSpeechTranscript('');
    setIsListening(false);
    startTimeRef.current = Date.now();

    const openingMessage = await conversationService.current.startConversation(scenario);
    setMessages([openingMessage]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleScenarioSelect = async (scenario: ConversationScenario) => {
    if (scenario.topic === 'social_greeting') {
      setModePickerScenario(scenario);
      return;
    }
    await startScenario(scenario, 'text');
  };

  const handleModeSelect = async (mode: 'text' | 'talk') => {
    if (!modePickerScenario) return;
    const scenario = modePickerScenario;
    setModePickerScenario(null);
    await startScenario(scenario, mode);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userText = text.trim();
    setInputText('');
    setSpeechTranscript('');
    setIsLoading(true);

    try {
      await conversationService.current.processUserMessage(userText);
      const updatedMessages = conversationService.current.getMessages();
      setMessages([...updatedMessages]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Conversation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(inputText);
  };

  const handleSpeechResults = (event: any) => {
    if (event.value && event.value[0]) {
      const text = event.value[0];
      setSpeechTranscript(text);
      stopListening();
      sendMessage(text);
    }
  };

  const handleSpeechError = (event: any) => {
    console.error('Conversation speech error:', event);
    setIsListening(false);
  };

  const startListening = async () => {
    try {
      setSpeechTranscript('');
      setIsListening(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Start listening error:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (error) {
      console.error('Stop listening error:', error);
    } finally {
      setIsListening(false);
    }
  };

  const handleEndConversation = async () => {
    if (!currentUser || !selectedScenario) return;

    if (isListening) {
      await stopListening();
    }

    const summary = await conversationService.current.endConversation();

    const conversationSummary: ConversationSummary = {
      id: `conv-${Date.now()}`,
      timestamp: new Date(),
      scenario: selectedScenario.title,
      messageCount: summary.messageCount,
      duration: summary.duration,
    };

    const updatedProgress = {
      ...currentUser.progress,
      conversationHistory: [conversationSummary, ...currentUser.progress.conversationHistory].slice(0, 20),
    };
    const progressed = ProgressionService.applyProgression(updatedProgress);
    await updateUserProgress(progressed);
    navigation.goBack();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedScenario) {
    return (
      <View style={styles.container}>
        <AuraBackground />

        <View style={styles.scenarioSelectionContainer}>
          <View style={styles.scenarioHeader}>
            <LiquidGlassHeader
              title="Choose a Scenario"
              onBack={() => navigation.goBack()}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scenarioScroll}
          >
            {CONVERSATION_SCENARIOS.map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => handleScenarioSelect(scenario)}
              >
                <Text style={styles.scenarioCardTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioCardDescription}>{scenario.description}</Text>
                <Text style={styles.scenarioCardLevel}>Level {scenario.difficulty}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Modal visible={!!modePickerScenario} transparent animationType="fade">
          <View style={styles.modeOverlay}>
            <GlassCard style={styles.modeCard}>
              <Text style={styles.modeTitle}>Social Greeting</Text>
              <Text style={styles.modeSubtitle}>Choose how you want to practice.</Text>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={styles.modeButtonPrimary}
                  onPress={() => handleModeSelect('talk')}
                >
                  <Text style={styles.modeButtonText}>Talk It Out</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modeButtonSecondary}
                  onPress={() => handleModeSelect('text')}
                >
                  <Text style={styles.modeButtonTextSecondary}>Text Messages</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <AuraBackground />

      <View style={styles.conversationContainer}>
        {/* Header */}
        <View style={styles.conversationHeader}>
          <TouchableOpacity onPress={handleEndConversation}>
            <Text style={styles.headerBackButton}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{selectedScenario.title}</Text>
            <Text style={styles.headerSubtitle}>Duration: {formatDuration(duration)}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          {conversationMode === 'talk' ? (
            <GlassCard cornerRadius={24} padding={20}>
              <View style={styles.talkContainer}>
                <Text style={styles.talkLabel}>
                  {isListening ? 'Listening…' : 'Tap the mic and speak your response'}
                </Text>
                <Text style={styles.talkTranscript}>{speechTranscript || 'Say hello...'}</Text>
                <TouchableOpacity
                  style={[styles.micButton, isListening && styles.micButtonActive]}
                  onPress={isListening ? stopListening : startListening}
                  disabled={isLoading}
                >
                  <Text style={styles.micButtonText}>{isListening ? '■' : '🎤'}</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            <>
              <GlassCard cornerRadius={24} padding={0}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Type your response..."
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || isLoading}
                  >
                    <Text style={styles.sendButtonText}>✈</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>

              {/* Quick Responses */}
              {selectedScenario.quickResponses.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickResponsesScroll}
                >
                  {selectedScenario.quickResponses.map((response, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickResponseChip}
                      onPress={() => setInputText(response)}
                    >
                      <Text style={styles.quickResponseText}>{response}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {!isUser && <Text style={styles.messageLabel}>AURA Coach</Text>}
      <Text style={styles.messageText}>{message.content}</Text>
      {message.emotionalTone && (
        <Text style={styles.emotionalTone}>{getToneEmoji(message.emotionalTone)}</Text>
      )}
    </View>
  );
}

function getToneEmoji(tone: string): string {
  switch (tone) {
    case 'supportive': return '💙';
    case 'encouraging': return '⭐';
    case 'corrective': return '📝';
    default: return '💬';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenarioSelectionContainer: {
    flex: 1,
    paddingTop: 80,
  },
  modeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modeCard: {
    padding: 24,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  modeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  modeButtons: {
    gap: 12,
  },
  modeButtonPrimary: {
    backgroundColor: AURA_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modeButtonSecondary: {
    backgroundColor: AURA_COLORS.accentSoft,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  modeButtonTextSecondary: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  scenarioHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  scenarioScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  scenarioCard: {
    width: 280,
    backgroundColor: 'rgba(91, 124, 255, 0.22)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.border,
  },
  scenarioCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  scenarioCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  scenarioCardLevel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  conversationContainer: {
    flex: 1,
    paddingTop: 60,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerBackButton: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(91, 124, 255, 0.35)',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomLeftRadius: 4,
  },
  messageLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  messageText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  emotionalTone: {
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  talkContainer: {
    alignItems: 'center',
    gap: 12,
  },
  talkLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  talkTranscript: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 24,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 211, 238, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: 'rgba(248, 113, 113, 0.7)',
    borderColor: 'rgba(248, 113, 113, 0.85)',
  },
  micButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: AURA_FONTS.pixel,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AURA_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 18,
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
  },
  quickResponsesScroll: {
    maxHeight: 50,
  },
  quickResponseChip: {
    backgroundColor: AURA_COLORS.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 208, 255, 0.5)',
  },
  quickResponseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
});
