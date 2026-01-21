import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';

// Import all screens
import AuthenticationScreen from '../screens/AuthenticationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import GameScreen from '../screens/GameScreen';
import SpeechPracticeScreen from '../screens/SpeechPracticeScreen';
import MimicryScreen from '../screens/MimicryScreen';
import ConversationScreen from '../screens/ConversationScreen';
import ProgressScreen from '../screens/ProgressScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import APIKeyConfigScreen from '../screens/APIKeyConfigScreen';
import VoiceCommandScreen from '../screens/VoiceCommandScreen';
import VisionTrainingScreen from '../screens/VisionTrainingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initialize();
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown initialization error');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={AURA_COLORS.accent} />
        <Text style={styles.loadingText}>Loading AURA...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthenticationScreen} />
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="SpeechPractice"
            component={SpeechPracticeScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Mimicry"
            component={MimicryScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Conversation"
            component={ConversationScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Progress"
            component={ProgressScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboardScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="APIKeyConfig"
            component={APIKeyConfigScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="VoiceCommands"
            component={VoiceCommandScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="VisionTraining"
            component={VisionTrainingScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ presentation: 'modal' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f1a',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  errorTitle: {
    color: AURA_COLORS.dangerDark,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: AURA_FONTS.body,
  },
  errorHint: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
});
