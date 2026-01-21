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
} from 'react-native';
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

export default function ConversationScreen({ navigation }: any) {
  const { currentUser, updateUserProgress } = useAuthStore();
  const [selectedScenario, setSelectedScenario] = useState<ConversationScenario | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
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

  const handleScenarioSelect = async (scenario: ConversationScenario) => {
    setSelectedScenario(scenario);
    setMessages([]);
    startTimeRef.current = Date.now();

    // Start conversation
    const openingMessage = await conversationService.current.startConversation(scenario);
    setMessages([openingMessage]);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      const assistantMessage = await conversationService.current.processUserMessage(userText);
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

  const handleEndConversation = async () => {
    if (!currentUser || !selectedScenario) return;

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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.scenarioTitle}>Choose a Scenario</Text>
            <View style={{ width: 60 }} />
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
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  backButton: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  scenarioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scenarioScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  scenarioCard: {
    width: 280,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  scenarioCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  scenarioCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
  },
  scenarioCardLevel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
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
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
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
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
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
  },
  messageText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 18,
    color: 'white',
  },
  quickResponsesScroll: {
    maxHeight: 50,
  },
  quickResponseChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickResponseText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
