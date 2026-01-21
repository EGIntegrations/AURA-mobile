import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AuthenticationService } from '../services/AuthenticationService';
import { User, UserRole } from '../types';
import AuraBackground from '../components/AuraBackground';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';
import { AURA_COLORS } from '../theme/colors';
import LiquidGlassHeader from '../components/LiquidGlassHeader';
import { AURA_FONTS } from '../theme/typography';

type TabType = 'overview' | 'learners' | 'progress' | 'settings';

export default function AdminDashboardScreen({ navigation }: any) {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [supervisedUsers, setSupervisedUsers] = useState<User[]>([]);

  if (!currentUser) return null;

  const hasPermission =
    currentUser.role === UserRole.TEACHER ||
    currentUser.role === UserRole.PARENT ||
    currentUser.role === UserRole.ADMIN;

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <AuraBackground />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>You don't have permission to view this page</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  useEffect(() => {
    const loadSupervisedUsers = async () => {
      if (!currentUser) return;
      const users = await AuthenticationService.getSupervisedUsers(currentUser.id);
      setSupervisedUsers(users);
    };

    loadSupervisedUsers();
  }, [currentUser, showAddUserModal]);

  const totalSessions = useMemo(() => {
    return supervisedUsers.reduce((sum, user) => sum + user.progress.totalSessions, 0);
  }, [supervisedUsers]);

  const avgAccuracy = useMemo(() => {
    if (supervisedUsers.length === 0) return 0;
    const total = supervisedUsers.reduce((sum, user) => sum + user.progress.overallAccuracy, 0);
    return total / supervisedUsers.length;
  }, [supervisedUsers]);

  const resetNewUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserUsername('');
    setNewUserPassword('');
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserUsername || !newUserPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await AuthenticationService.signUp(
        newUserUsername,
        newUserEmail,
        newUserName,
        UserRole.STUDENT,
        newUserPassword,
        currentUser.id,
        { setAsCurrentUser: false }
      );

      Alert.alert('Success', `${newUserName} has been added as a learner`);
      setShowAddUserModal(false);
      resetNewUserForm();
      const updatedUsers = await AuthenticationService.getSupervisedUsers(currentUser.id);
      setSupervisedUsers(updatedUsers);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const generateReport = () => {
    const report = `AURA Progress Report
Generated: ${new Date().toLocaleDateString()}

Supervised Learners: ${supervisedUsers.length}
Total Sessions: ${totalSessions}
Average Accuracy: ${Math.round(avgAccuracy * 100)}%

Learner Details:
${supervisedUsers.map((user) => `- ${user.displayName} (Level ${user.progress.currentLevel}) • ${Math.round(user.progress.overallAccuracy * 100)}% accuracy`).join('\n')}
`;

    Share.share({ message: report, title: 'AURA Progress Report' });
  };

  const shareResources = () => {
    const message = `AURA Resources\n\n- Emotion practice tips\n- Home routines for caregivers\n- Conversation starters\n\nVisit the admin portal for downloadable materials.`;
    Share.share({ message, title: 'AURA Resources' });
  };

  return (
    <View style={styles.container}>
      <AuraBackground />

      <View style={styles.content}>
        {/* Header */}
        <LiquidGlassHeader
          title="Admin Dashboard"
          onBack={() => navigation.goBack()}
          style={styles.headerCard}
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              <TabButton
                label="Overview"
                active={activeTab === 'overview'}
                onPress={() => setActiveTab('overview')}
              />
              <TabButton
                label="Learners"
                active={activeTab === 'learners'}
                onPress={() => setActiveTab('learners')}
              />
              <TabButton
                label="Progress"
                active={activeTab === 'progress'}
                onPress={() => setActiveTab('progress')}
              />
              <TabButton
                label="Settings"
                active={activeTab === 'settings'}
                onPress={() => setActiveTab('settings')}
              />
            </View>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentScroll}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' && (
            <View style={styles.tabPanel}>
              <GlassCard>
                <Text style={styles.cardTitle}>Today at a Glance</Text>
                <View style={styles.statsRow}>
                  <StatBox label="Learners" value={supervisedUsers.length.toString()} />
                  <StatBox label="Sessions" value={totalSessions.toString()} />
                  <StatBox label="Avg Accuracy" value={`${Math.round(avgAccuracy * 100)}%`} />
                </View>
              </GlassCard>

              <GlassCard>
                <Text style={styles.cardTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                  <GlassButton title="Generate Report" onPress={generateReport} style="primary" />
                  <GlassButton
                    title="Share Resources"
                    onPress={shareResources}
                    style="secondary"
                  />
                </View>
              </GlassCard>

              <GlassCard>
                <Text style={styles.cardTitle}>Recent Conversations</Text>
                <Text style={styles.emptyText}>No recent AI conversations</Text>
              </GlassCard>
            </View>
          )}

          {activeTab === 'learners' && (
            <View style={styles.tabPanel}>
              <GlassButton
                title="+ Add New Learner"
                onPress={() => setShowAddUserModal(true)}
                customStyle={styles.addButton}
              />

              {supervisedUsers.length === 0 ? (
                <GlassCard>
                  <Text style={styles.emptyText}>No learners added yet</Text>
                </GlassCard>
              ) : (
                supervisedUsers.map((user, index) => (
                  <GlassCard key={user.id}>
                    <View style={styles.learnerCard}>
                      <View style={styles.learnerAvatar}>
                        <Text style={styles.learnerInitials}>
                          {user.displayName
                            .split(' ')
                            .map(part => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.learnerInfo}>
                        <Text style={styles.learnerName}>{user.displayName}</Text>
                        <Text style={styles.learnerRole}>
                          {user.role} • Level {user.progress.currentLevel}
                        </Text>
                      </View>
                      <View style={styles.learnerMetrics}>
                        <MetricChip label={`${Math.round(user.progress.overallAccuracy * 100)}%`} />
                        <MetricChip label={`${user.progress.totalSessions} sessions`} />
                        <MetricChip label={`Streak: ${user.progress.bestStreak}`} />
                      </View>
                    </View>
                  </GlassCard>
                ))
              )}
            </View>
          )}

          {activeTab === 'progress' && (
            <View style={styles.tabPanel}>
              <GlassCard>
                <Text style={styles.cardTitle}>Group Trends</Text>
                <Text style={styles.placeholderText}>
                  Analytics charts would appear here showing group performance over time
                </Text>
              </GlassCard>

              <GlassCard>
                <Text style={styles.cardTitle}>Emotions Needing Practice</Text>
                <Text style={styles.placeholderText}>
                  List of emotions with low accuracy scores across the group
                </Text>
              </GlassCard>

              <GlassCard>
                <Text style={styles.cardTitle}>Recent Group Wins</Text>
                <View style={styles.winsContainer}>
                  <WinRow learner="Learner 1" score={850} accuracy={92} />
                  <WinRow learner="Learner 2" score={720} accuracy={88} />
                  <WinRow learner="Learner 3" score={690} accuracy={85} />
                </View>
              </GlassCard>
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={styles.tabPanel}>
              <GlassCard>
                <Text style={styles.cardTitle}>Notifications</Text>
                <SettingRow
                  label="Notify me when a learner finishes a session"
                  enabled={false}
                />
                <SettingRow
                  label="Automatically send weekly report to caregivers"
                  enabled={false}
                />
              </GlassCard>

              <GlassCard>
                <Text style={styles.cardTitle}>About</Text>
                <Text style={styles.aboutText}>AURA Admin Dashboard v1.0</Text>
                <Text style={styles.aboutText}>Manage learners and track progress</Text>
              </GlassCard>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add User Modal */}
      <Modal visible={showAddUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Learner</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Display Name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newUserName}
              onChangeText={setNewUserName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newUserUsername}
              onChangeText={setNewUserUsername}
              autoCapitalize="none"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Temporary Password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newUserPassword}
              onChangeText={setNewUserPassword}
              autoCapitalize="none"
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowAddUserModal(false);
                  resetNewUserForm();
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddUser}>
                <Text style={styles.modalButtonText}>Add Learner</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

// Component helpers
function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText}>{label}</Text>
    </View>
  );
}

function WinRow({
  learner,
  score,
  accuracy,
}: {
  learner: string;
  score: number;
  accuracy: number;
}) {
  return (
    <View style={styles.winRow}>
      <Text style={styles.winLearner}>{learner}</Text>
      <Text style={styles.winScore}>Score: {score}</Text>
      <Text style={styles.winAccuracy}>{accuracy}% accuracy</Text>
    </View>
  );
}

function SettingRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingStatus}>{enabled ? 'ON' : 'OFF'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  backButton: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  headerCard: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabActive: {
    backgroundColor: AURA_COLORS.accentSoft,
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
  },
  tabContentScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  tabPanel: {
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 4,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  actionsRow: {
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  addButton: {
    marginBottom: 8,
  },
  learnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  learnerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AURA_COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  learnerInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.4,
  },
  learnerInfo: {
    flex: 1,
  },
  learnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  learnerRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  learnerMetrics: {
    gap: 6,
  },
  metricChip: {
    backgroundColor: AURA_COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metricChipText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  winsContainer: {
    gap: 12,
  },
  winRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  winLearner: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  winScore: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  winAccuracy: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabel: {
    fontSize: 14,
    color: 'white',
    flex: 1,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  settingStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  aboutText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 8,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: 'rgba(91, 124, 255, 0.22)',
    borderRadius: 16,
    padding: 14,
    color: 'white',
    marginBottom: 16,
    fontSize: 16,
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: AURA_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: 'rgba(91, 124, 255, 0.18)',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
  modalButtonTextSecondary: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: AURA_FONTS.pixel,
    letterSpacing: 0.3,
  },
});
