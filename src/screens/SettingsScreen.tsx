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
import { AURA_COLORS } from '../theme/colors';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
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
            <Text style={styles.settingLabel}>Sound</Text>
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
            <Text style={styles.settingLabel}>Dark Theme</Text>
            <Switch
              value={isDarkTheme}
              onValueChange={setIsDarkTheme}
              trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: AURA_COLORS.accentSoft }}
              thumbColor={isDarkTheme ? AURA_COLORS.accent : 'rgba(255, 255, 255, 0.9)'}
            />
          </View>
        </LiquidGlassCard>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: AURA_COLORS.glass.base }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
  signOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AURA_COLORS.glass.borderLight,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: AURA_COLORS.danger,
    fontFamily: AURA_FONTS.rounded,
    letterSpacing: 0.3,
  },
});
