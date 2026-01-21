import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { BiometricService } from '../services/BiometricService';
import { UserRole } from '../types';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export default function AuthenticationScreen() {
  const { signIn, signUp, signInWithBiometric, isLoading, error } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');
  const showDemoLogins = __DEV__;
  const roleOptions = __DEV__
    ? Object.values(UserRole)
    : [UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER];

  useEffect(() => {
    const loadBiometricState = async () => {
      try {
        const canAuth = await BiometricService.canAuthenticate();
        const savedUsername = await BiometricService.getSavedUsername();
        const enabled = await BiometricService.isEnabled();
        const type = await BiometricService.getBiometricType();
        const label =
          type === 'faceId' ? 'Face ID' : type === 'touchId' || type === 'fingerprint' ? 'Touch ID' : 'Biometric';

        setShowBiometric(canAuth && enabled && !!savedUsername);
        setBiometricLabel(label);
      } catch (err) {
        setShowBiometric(false);
      }
    };

    loadBiometricState();
  }, []);

  const handleSubmit = async () => {
    if (!username || !password) {
      return;
    }

    if (isSignUp) {
      if (!email || !displayName) return;
      await signUp(username.trim(), email.trim(), displayName.trim(), role, password);
    } else {
      await signIn(username.trim(), password);
    }
  };

  const fillDemoCredentials = (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword('demo');
  };

  return (
    <View style={styles.container}>
      <AuraBackground />
      <LinearGradient
        colors={['rgba(91, 124, 255, 0.35)', 'rgba(12, 18, 28, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(163, 123, 255, 0.3)', 'rgba(12, 18, 28, 0)']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>AURA</Text>
            <Text style={styles.subtitle}>
              Autism Understanding & Recognition Assistant
            </Text>

            <View style={styles.cardWrap}>
              <LinearGradient
                colors={['rgba(91, 124, 255, 0.35)', 'rgba(163, 123, 255, 0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGlow}
                pointerEvents="none"
              />
              <GlassCard style={styles.card}>
              <View style={styles.segmentControl}>
                <TouchableOpacity
                  onPress={() => setIsSignUp(false)}
                  style={styles.segmentButton}
                >
                  <Text
                    style={[
                      styles.segment,
                      !isSignUp && styles.segmentActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsSignUp(true)}
                  style={styles.segmentButton}
                >
                  <Text
                    style={[
                      styles.segment,
                      isSignUp && styles.segmentActive,
                    ]}
                  >
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {isSignUp && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Display Name"
                    placeholderTextColor="#888"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                  <View style={styles.roleRow}>
                    {roleOptions.map((userRole) => (
                      <TouchableOpacity
                        key={userRole}
                        style={[
                          styles.roleChip,
                          role === userRole && styles.roleChipActive,
                        ]}
                        onPress={() => setRole(userRole)}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            role === userRole && styles.roleChipTextActive,
                          ]}
                        >
                          {userRole}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <GlassButton
                title={
                  isLoading
                    ? 'Loading...'
                    : isSignUp
                    ? 'Create Account'
                    : 'Sign In'
                }
                onPress={handleSubmit}
                disabled={isLoading}
                customStyle={styles.signInButton}
              />

              {showBiometric && !isSignUp && (
                <GlassButton
                  title={`Sign in with ${biometricLabel}`}
                  onPress={signInWithBiometric}
                  disabled={isLoading}
                  style="secondary"
                  customStyle={styles.biometricButton}
                />
              )}

              {error && <Text style={styles.error}>{error}</Text>}
              </GlassCard>
            </View>

            {showDemoLogins && (
              <View style={styles.demoContainer}>
                <Text style={styles.demoLabel}>Quick demo logins</Text>
                <View style={styles.demoChips}>
                  {['teacher1', 'parent1', 'student1'].map((user) => (
                    <TouchableOpacity
                      key={user}
                      style={styles.demoChip}
                      onPress={() => fillDemoCredentials(user)}
                    >
                      <Text style={styles.demoChipText}>{user}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 160,
    opacity: 0.9,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 180,
    opacity: 0.85,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 1.4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  cardWrap: {
    marginBottom: 24,
  },
  cardGlow: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    borderRadius: 28,
    opacity: 0.7,
  },
  card: {
    backgroundColor: 'rgba(12, 18, 28, 0.75)',
    borderColor: AURA_COLORS.glass.border,
  },
  segmentControl: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  segmentButton: {
    flex: 1,
  },
  segment: {
    padding: 12,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  segmentActive: {
    color: 'white',
    backgroundColor: 'rgba(91, 124, 255, 0.35)',
    borderRadius: 12,
  },
  input: {
    backgroundColor: 'rgba(91, 124, 255, 0.18)',
    borderRadius: 16,
    padding: 14,
    color: 'white',
    marginBottom: 16,
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  signInButton: {
    marginTop: 8,
  },
  biometricButton: {
    marginTop: 12,
  },
  error: {
    color: AURA_COLORS.dangerDark,
    marginTop: 12,
    textAlign: 'center',
    fontFamily: AURA_FONTS.pixel,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  roleChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  roleChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  roleChipText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  roleChipTextActive: {
    color: 'white',
  },
  demoContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  demoLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  demoChips: {
    flexDirection: 'row',
    gap: 8,
  },
  demoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  demoChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
});
