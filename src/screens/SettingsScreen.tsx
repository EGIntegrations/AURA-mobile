import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { BiometricService } from '../services/BiometricService';
import { AURA_COLORS } from '../theme/colors';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_FONTS } from '../theme/typography';

export default function SettingsScreen({ navigation }: any) {
  const { currentUser } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric Login');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadBiometricStatus = async () => {
      try {
        const canAuth = await BiometricService.canAuthenticate();
        const enabled = await BiometricService.isEnabled();
        const type = await BiometricService.getBiometricType();
        const label =
          type === 'faceId' ? 'Face ID' : type === 'touchId' || type === 'fingerprint' ? 'Touch ID' : 'Biometric';
        setBiometricLabel(label);
        setBiometricAvailable(canAuth);
        setBiometricEnabled(enabled);
      } catch (error) {
        setBiometricAvailable(false);
        setBiometricEnabled(false);
      }
    };

    loadBiometricStatus();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (!currentUser) {
      Alert.alert('Unavailable', 'Please sign in to configure biometric login.');
      return;
    }

    setIsUpdating(true);
    try {
      if (value) {
        await BiometricService.enable(currentUser.username);
      } else {
        await BiometricService.disable();
      }
      setBiometricEnabled(value);
    } catch (error) {
      Alert.alert('Biometric Login', (error as Error).message);
      setBiometricEnabled(await BiometricService.isEnabled());
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <View style={styles.content}>
        <LiquidGlassHeader
          title="Settings"
          onBack={() => navigation.goBack()}
          style={styles.headerCard}
        />

        <GlassCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Access</Text>
            <Text style={styles.sectionSubtitle}>Secure sign-in preferences</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{biometricLabel}</Text>
              <Text style={styles.settingDescription}>
                {biometricAvailable
                  ? 'Use biometrics to sign in faster.'
                  : 'Biometric authentication is not available on this device.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!biometricAvailable || isUpdating}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accentSoft }}
              thumbColor={biometricEnabled ? AURA_COLORS.accent : 'rgba(255, 255, 255, 0.9)'}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Voice Commands</Text>
            <Text style={styles.sectionSubtitle}>
              Control AURA hands-free from a single place.
            </Text>
          </View>
          <GlassButton
            title="Open Voice Commands"
            onPress={() => navigation.navigate('VoiceCommands')}
            customStyle={styles.actionButton}
          />
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 20,
  },
  headerCard: {
    marginBottom: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
    gap: 6,
  },
  settingTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  settingDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  actionButton: {
    marginTop: 4,
  },
});
