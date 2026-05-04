import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import AuraBackground from '../components/AuraBackground';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_COLORS } from '../theme/colors';
import { AURA_FONTS } from '../theme/typography';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LiquidGlassHeader
          title="Settings"
          onBackPress={() => navigation.goBack()}
          style={styles.headerCard}
        />

        <LiquidGlassCard>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sound</Text>
              <Text style={styles.settingDescription}>
                Enable or disable app sounds
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accentSoft }}
              thumbColor={soundEnabled ? AURA_COLORS.accent : 'rgba(255, 255, 255, 0.9)'}
            />
          </View>
        </LiquidGlassCard>

        <LiquidGlassCard>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Theme</Text>
              <Text style={styles.settingDescription}>
                {isDarkTheme ? 'Dark' : 'Light'} mode
              </Text>
            </View>
            <Switch
              value={isDarkTheme}
              onValueChange={setIsDarkTheme}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accentSoft }}
              thumbColor={isDarkTheme ? AURA_COLORS.accent : 'rgba(255, 255, 255, 0.9)'}
            />
          </View>
        </LiquidGlassCard>

        <LiquidGlassCard>
          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </LiquidGlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 20,
  },
  headerCard: {
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
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
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  settingDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  signOutRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.danger,
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
});
