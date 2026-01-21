import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { APIKeyService } from '../services/APIKeyService';
import { BackendClient } from '../services/BackendClient';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export default function APIKeyConfigScreen({ navigation }: any) {
  const backendEnabled = BackendClient.isConfigured();
  const [openAIKey, setOpenAIKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!backendEnabled) {
      loadKeys();
    }
  }, [backendEnabled]);

  const loadKeys = async () => {
    const openai = await APIKeyService.getOpenAIKey();
    const elevenlabs = await APIKeyService.getElevenLabsKey();

    if (openai) setOpenAIKey(maskKey(openai));
    if (elevenlabs) setElevenLabsKey(maskKey(elevenlabs));
  };

  const maskKey = (key: string): string => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const handleSaveOpenAI = async () => {
    if (!openAIKey || openAIKey.includes('•')) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setLoading(true);
    try {
      await APIKeyService.saveOpenAIKey(openAIKey);
      Alert.alert('Success', 'OpenAI API key saved successfully');
      setOpenAIKey(maskKey(openAIKey));
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveElevenLabs = async () => {
    if (!elevenLabsKey || elevenLabsKey.includes('•')) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setLoading(true);
    try {
      await APIKeyService.saveElevenLabsKey(elevenLabsKey);
      Alert.alert('Success', 'ElevenLabs API key saved successfully');
      setElevenLabsKey(maskKey(elevenLabsKey));
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All API Keys',
      'Are you sure you want to delete all saved API keys?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await APIKeyService.deleteAllKeys();
            setOpenAIKey('');
            setElevenLabsKey('');
            Alert.alert('Success', 'All API keys deleted');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <LiquidGlassHeader
            title="API Configuration"
            onBack={() => navigation.goBack()}
            style={styles.headerCard}
          />

          {/* Info Card */}
          <GlassCard>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🔐</Text>
              <Text style={styles.infoTitle}>Secure API Key Storage</Text>
              <Text style={styles.infoText}>
                Your API keys are stored securely on this device using encrypted storage. They are
                never sent to any external servers except the respective AI services.
              </Text>
            </View>
          </GlassCard>

          {backendEnabled && (
            <GlassCard>
              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>✅</Text>
                <Text style={styles.infoTitle}>Server-Managed Keys</Text>
                <Text style={styles.infoText}>
                  This build uses the AURA backend. API keys are managed by your billing account,
                  so no manual entry is required.
                </Text>
              </View>
            </GlassCard>
          )}

          {!backendEnabled && (
            <>
              <GlassCard>
                <Text style={styles.sectionTitle}>OpenAI API Key</Text>
                <Text style={styles.sectionDescription}>
                  Required for AI conversations, emotion detection, and image generation
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="sk-..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={openAIKey}
                  onChangeText={setOpenAIKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={openAIKey.includes('•')}
                />

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setOpenAIKey('')}
                >
                  <Text style={styles.clearButtonText}>Clear and re-enter</Text>
                </TouchableOpacity>

                <GlassButton
                  title="Save OpenAI Key"
                  onPress={handleSaveOpenAI}
                  disabled={loading}
                  customStyle={styles.saveButton}
                />

                <View style={styles.linkContainer}>
                  <Text style={styles.linkLabel}>Get your API key:</Text>
                  <Text style={styles.linkText}>https://platform.openai.com/api-keys</Text>
                </View>
              </GlassCard>

              <GlassCard>
                <Text style={styles.sectionTitle}>ElevenLabs API Key</Text>
                <Text style={styles.sectionDescription}>
                  Optional: For high-quality text-to-speech voice synthesis
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter ElevenLabs API key..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={elevenLabsKey}
                  onChangeText={setElevenLabsKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={elevenLabsKey.includes('•')}
                />

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setElevenLabsKey('')}
                >
                  <Text style={styles.clearButtonText}>Clear and re-enter</Text>
                </TouchableOpacity>

                <GlassButton
                  title="Save ElevenLabs Key"
                  onPress={handleSaveElevenLabs}
                  disabled={loading}
                  customStyle={styles.saveButton}
                />

                <View style={styles.linkContainer}>
                  <Text style={styles.linkLabel}>Get your API key:</Text>
                  <Text style={styles.linkText}>https://elevenlabs.io/app/settings/api-keys</Text>
                </View>
              </GlassCard>
            </>
          )}

          {/* Status Card */}
          <GlassCard>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>OpenAI:</Text>
              <Text style={[styles.statusValue, (backendEnabled || openAIKey) && styles.statusActive]}>
                {backendEnabled ? '✓ Managed by server' : openAIKey ? '✓ Configured' : '✗ Not configured'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>ElevenLabs:</Text>
              <Text style={[styles.statusValue, (backendEnabled || elevenLabsKey) && styles.statusActive]}>
                {backendEnabled ? '✓ Managed by server' : elevenLabsKey ? '✓ Configured' : '✗ Not configured'}
              </Text>
            </View>
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard>
            <Text style={styles.sectionTitle}>Danger Zone</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
              <Text style={styles.deleteButtonText}>Delete All API Keys</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              💡 Tip: If server-managed keys are enabled, no local keys are required. Without
              any keys configured, the app will use fallback features like system TTS.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
    gap: 24,
  },
  headerCard: {
    marginBottom: 4,
  },
  infoCard: {
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    fontSize: 48,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: AURA_FONTS.body,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 16,
    fontFamily: AURA_FONTS.body,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    padding: 14,
    color: 'white',
    fontSize: 14,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  clearButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  clearButtonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  saveButton: {
    marginTop: 8,
  },
  linkContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  linkLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  linkText: {
    fontSize: 12,
    color: AURA_COLORS.accent,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusLabel: {
    fontSize: 14,
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  statusValue: {
    fontSize: 14,
    color: AURA_COLORS.dangerDark,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  statusActive: {
    color: AURA_COLORS.success,
  },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  deleteButtonText: {
    color: AURA_COLORS.dangerDark,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  helpContainer: {
    padding: 16,
    backgroundColor: 'rgba(91, 124, 255, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(91, 124, 255, 0.35)',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    fontFamily: AURA_FONTS.body,
  },
});
