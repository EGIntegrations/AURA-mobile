import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from 'expo-speech-recognition';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

interface CommandDefinition {
  label: string;
  hints: string[];
  action: () => void;
}

export default function VoiceCommandScreen({ navigation }: any) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');

  const commands: CommandDefinition[] = [
    {
      label: 'Start Game',
      hints: ['start game', 'emotion recognition', 'play game'],
      action: () => navigation.navigate('Game'),
    },
    {
      label: 'Speech Practice',
      hints: ['speech practice', 'practice emotions', 'voice practice'],
      action: () => navigation.navigate('SpeechPractice'),
    },
    {
      label: 'Facial Mimicry',
      hints: ['mimicry', 'camera practice', 'facial practice'],
      action: () => navigation.navigate('Mimicry'),
    },
    {
      label: 'Progress',
      hints: ['check progress', 'my progress', 'progress report'],
      action: () => navigation.navigate('Progress'),
    },
    {
      label: 'AI Conversation',
      hints: ['conversation practice', 'chat', 'talk to aura'],
      action: () => navigation.navigate('Conversation'),
    },
    {
      label: 'Help',
      hints: ['help', 'instructions', 'how to use'],
      action: () => Alert.alert('Help', 'Try saying “start game” or “speech practice”.'),
    },
  ];

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results[0]?.transcript) {
      const text = event.results[0].transcript.toLowerCase();
      setTranscript(text);
      const matched = matchCommand(text);
      if (matched) {
        setLastCommand(matched.label);
        matched.action();
        stopListening();
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Voice command error:', event.error);
    setIsListening(false);
  });

  useEffect(() => {
    const setup = async () => {
      await Audio.requestPermissionsAsync();
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    };
    setup();
  }, []);

  const matchCommand = (text: string): CommandDefinition | null => {
    return (
      commands.find(command =>
        command.hints.some(hint => text.includes(hint))
      ) || null
    );
  };

  const startListening = async () => {
    try {
      setTranscript('');
      setLastCommand('');
      setIsListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (error) {
      console.error('Start listening error:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Stop listening error:', error);
    } finally {
      setIsListening(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiquidGlassHeader
          title="Voice Commands"
          onBack={() => navigation.goBack()}
          style={styles.headerCard}
        />

        <GlassCard>
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Try saying:</Text>
            {commands.map((command) => (
              <Text key={command.label} style={styles.commandHint}>
                • {command.hints[0]}
              </Text>
            ))}
          </View>
        </GlassCard>

        <GlassCard>
          <View style={styles.listeningCard}>
            <Text style={styles.listeningLabel}>
              {isListening ? 'Listening…' : 'Tap to start listening'}
            </Text>
            <Text style={styles.transcriptText}>{transcript || 'Say a command'}</Text>
            {lastCommand ? (
              <Text style={styles.lastCommand}>Matched: {lastCommand}</Text>
            ) : null}
            <GlassButton
              title={isListening ? 'Stop Listening' : 'Start Listening'}
              onPress={isListening ? stopListening : startListening}
              style={isListening ? 'danger' : 'primary'}
              customStyle={styles.listenButton}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={styles.quickTitle}>Quick Launch</Text>
          <View style={styles.quickGrid}>
            {commands.slice(0, 5).map((command) => (
              <TouchableOpacity
                key={command.label}
                style={styles.quickButton}
                onPress={command.action}
              >
                <Text style={styles.quickButtonText}>{command.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 20,
  },
  headerCard: {
    marginBottom: 4,
  },
  instructions: {
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  commandHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  listeningCard: {
    alignItems: 'center',
    gap: 12,
  },
  listeningLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  transcriptText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    minHeight: 24,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  lastCommand: {
    color: AURA_COLORS.success,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  listenButton: {
    alignSelf: 'stretch',
  },
  quickTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: AURA_COLORS.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126, 208, 255, 0.45)',
  },
  quickButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
});
