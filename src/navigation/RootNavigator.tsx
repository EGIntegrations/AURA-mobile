import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';

// Active screens
import AuthenticationScreen from '../screens/AuthenticationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TaskLibraryScreen from '../screens/TaskLibraryScreen';
import TaskPlayerScreen from '../screens/TaskPlayerScreen';
import VocabularyScreen from '../screens/VocabularyScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';
import { Logger } from '../services/Logger';

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
        Logger.error('Initialization error', err instanceof Error ? err.message : 'Unknown error');
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
            name="TaskLibrary"
            component={TaskLibraryScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="TaskPlayer"
            component={TaskPlayerScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="Vocabulary"
            component={VocabularyScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Progress"
            component={ProgressScreen}
            options={{ presentation: 'modal' }}
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
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  errorTitle: {
    color: AURA_COLORS.dangerDark,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: AURA_FONTS.rounded,
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
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.2,
  },
});
