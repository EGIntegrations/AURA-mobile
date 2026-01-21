import SwiftUI

/// Admin/teacher hub for viewing supervised users and actions.
struct AdminDashboardView: View {
    @EnvironmentObject private var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab: DashboardTab = .overview
    @State private var showingAddUser = false
    @State private var showingReport = false
    @State private var generatedReport: String = ""

    private var supervisedUsers: [User] { authManager.getSupervisedUsers() }
    private var totalProgress: PlayerProgress {
        supervisedUsers.reduce(PlayerProgress()) { partial, user in
            var next = partial
            next.totalScore += user.progress.totalScore
            next.totalSessions += user.progress.totalSessions
            next.totalCorrectAnswers += user.progress.totalCorrectAnswers
            next.totalQuestions += user.progress.totalQuestions
            next.bestStreak = max(next.bestStreak, user.progress.bestStreak)
            next.unlockedEmotions.formUnion(user.progress.unlockedEmotions)
            next.speechPracticeHistory.append(contentsOf: user.progress.speechPracticeHistory)
            next.conversationSessions.append(contentsOf: user.progress.conversationSessions)
            next.mimicrySessions.append(contentsOf: user.progress.mimicrySessions)
            return next
        }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AuraBackground()

                VStack(spacing: 0) {
                    SegmentedHeader(selectedTab: $selectedTab)
                        .padding(.top, 16)
                        .padding(.horizontal, 22)

                    TabView(selection: $selectedTab) {
                        ScrollView(showsIndicators: false) {
                            OverviewSection(supervisedUsers: supervisedUsers, progress: totalProgress, onGenerateReport: prepareReport)
                        }
                        .padding(.horizontal, 22)
                        .tag(DashboardTab.overview)

                        SupervisedUsersSection(users: supervisedUsers)
                            .padding(.horizontal, 22)
                            .tag(DashboardTab.learners)

                        ProgressInsightsSection(users: supervisedUsers)
                            .padding(.horizontal, 22)
                            .tag(DashboardTab.progress)

                        SettingsSection()
                            .padding(.horizontal, 22)
                            .tag(DashboardTab.settings)
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
            .navigationTitle("Admin Dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Back", action: dismiss.callAsFunction)
                        .foregroundStyle(.white)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    GlassButton(style: .primary) {
                        showingAddUser = true
                    } label: {
                        Label("Add User", systemImage: "person.badge.plus")
                            .labelStyle(.titleAndIcon)
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddUser) {
            AddUserSheet()
                .environmentObject(authManager)
                .presentationDetents([.fraction(0.6)])
        }
        .sheet(isPresented: $showingReport) {
            ReportPreviewSheet(report: generatedReport)
        }
    }

    private func prepareReport() {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium

        var lines: [String] = []
        lines.append("AURA Supervision Report")
        lines.append("Generated: \(formatter.string(from: Date()))")
        lines.append("")
        lines.append("Supervised learners: \(supervisedUsers.count)")
        lines.append("Total sessions: \(totalProgress.totalSessions)")
        let accuracy = totalProgress.totalQuestions > 0 ? Int(totalProgress.overallAccuracy * 100) : 0
        lines.append("Average accuracy: \(accuracy)%")
        lines.append("")

        if !supervisedUsers.isEmpty {
            lines.append("Top performers:")
            let topUsers = supervisedUsers.sorted { lhs, rhs in
                lhs.progress.overallAccuracy > rhs.progress.overallAccuracy
            }.prefix(3)
            for user in topUsers {
                let userAccuracy = user.progress.totalQuestions > 0 ? Int(user.progress.overallAccuracy * 100) : 0
                lines.append("- \(user.displayName): Level \(user.progress.currentLevel), \(userAccuracy)% accuracy")
            }
        }

        generatedReport = lines.joined(separator: "\n")
        showingReport = true
    }
}

// MARK: - Tabs
private enum DashboardTab: String, CaseIterable, Identifiable {
    case overview
    case learners
    case progress
    case settings

    var id: String { rawValue }
    var title: String {
        switch self {
        case .overview: return "Overview"
        case .learners: return "Learners"
        case .progress: return "Progress"
        case .settings: return "Settings"
        }
    }
    var icon: String {
        switch self {
        case .overview: return "sparkles"
        case .learners: return "person.2"
        case .progress: return "chart.xyaxis.line"
        case .settings: return "gear"
        }
    }
}

private struct SegmentedHeader: View {
    @Binding var selectedTab: DashboardTab

    var body: some View {
        GlassCard(padding: 12) {
            HStack(spacing: 12) {
                ForEach(DashboardTab.allCases) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: tab.icon)
                            Text(tab.title)
                        }
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(selectedTab == tab ? Color.white.opacity(0.18) : .clear)
                        )
                        .foregroundStyle(.white.opacity(selectedTab == tab ? 1 : 0.65))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// MARK: - Overview
private struct OverviewSection: View {
    let supervisedUsers: [User]
    let progress: PlayerProgress
    let onGenerateReport: () -> Void

    private var averageAccuracy: Int {
        guard progress.totalQuestions > 0 else { return 0 }
        return Int(progress.overallAccuracy * 100)
    }

    var body: some View {
        VStack(spacing: 22) {
            GlassCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Today at a glance")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Supporting \(supervisedUsers.count) learners with personalized practice")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }

            GlassCard(padding: 20) {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 18)], spacing: 18) {
                    StatTile(title: "Learners", value: "\(supervisedUsers.count)", icon: "person.3.fill")
                    StatTile(title: "Sessions", value: "\(progress.totalSessions)", icon: "gamecontroller.fill")
                    StatTile(title: "Avg Accuracy", value: "\(averageAccuracy)%", icon: "target")
                    StatTile(title: "Speech Sessions", value: "\(progress.speechPracticeHistory.count)", icon: "mic")
                }
            }

            QuickActions(onGenerateReport: onGenerateReport)

            if !progress.conversationSessions.isEmpty {
                ConversationHighlights(conversations: progress.conversationSessions)
            }

            Spacer(minLength: 40)
        }
    }
}

private struct StatTile: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.white.opacity(0.9))
            Text(value)
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                )
        )
    }
}

private struct QuickActions: View {
    let onGenerateReport: () -> Void

    var body: some View {
        GlassCard(padding: 18) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Quick actions")
                    .font(.headline)
                    .foregroundStyle(.white)

                VStack(spacing: 12) {
                    QuickActionButton(title: "Generate shareable report", icon: "doc.text", gradient: Gradient(colors: [.cyan.opacity(0.9), .blue.opacity(0.7)]), action: onGenerateReport)

                    QuickActionButton(title: "Send encouragement", icon: "heart.bubble", gradient: Gradient(colors: [.pink.opacity(0.9), .purple.opacity(0.7)])) {
                        // Future hook for messaging
                    }
                }
            }
        }
    }
}

private struct QuickActionButton: View {
    let title: String
    let icon: String
    let gradient: Gradient
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.white)
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(18)
            .background(
                LinearGradient(gradient: gradient, startPoint: .topLeading, endPoint: .bottomTrailing)
                    .opacity(0.85)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            )
        }
        .buttonStyle(.plain)
        .shadow(color: .black.opacity(0.15), radius: 14, x: 0, y: 8)
    }
}

private struct ConversationHighlights: View {
    let conversations: [ConversationSummary]

    var body: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Recent AI conversations")
                    .font(.headline)
                    .foregroundStyle(.white)

                VStack(spacing: 14) {
                    ForEach(conversations.prefix(3)) { summary in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(summary.scenarioTitle)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white)
                            Text(summary.highlights)
                                .font(.footnote)
                                .foregroundStyle(.white.opacity(0.7))
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.white.opacity(0.07))
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Learner Management
private struct SupervisedUsersSection: View {
    let users: [User]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 18) {
                ForEach(users) { user in
                    LearnerRow(user: user)
                }

                if users.isEmpty {
                    EmptyState(text: "Add learners to start tracking their progress.")
                        .padding(.top, 40)
                }
            }
            .padding(.bottom, 60)
        }
    }
}

private struct LearnerRow: View {
    let user: User

    private var accuracy: Int {
        guard user.progress.totalQuestions > 0 else { return 0 }
        return Int(user.progress.overallAccuracy * 100)
    }

    var body: some View {
        GlassCard(padding: 18) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .center, spacing: 14) {
                    Circle()
                        .fill(Color.blue.opacity(0.7))
                        .frame(width: 46, height: 46)
                        .overlay(Text(user.displayName.prefix(2)).font(.headline).foregroundStyle(.white))

                    VStack(alignment: .leading, spacing: 4) {
                        Text(user.displayName)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text(user.role.displayName)
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.65))
                    }
                    Spacer()
                    Label("Level \(user.progress.currentLevel)", systemImage: "sparkles")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.9))
                }

                Divider().overlay(Color.white.opacity(0.12))

                HStack(spacing: 16) {
                    MetricChip(title: "Accuracy", value: "\(accuracy)%")
                    MetricChip(title: "Sessions", value: "\(user.progress.totalSessions)")
                    MetricChip(title: "Best streak", value: "\(user.progress.bestStreak)")
                }
            }
        }
    }
}

private struct MetricChip: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.65))
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .background(
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.1))
        )
    }
}

// MARK: - Progress insights
private struct ProgressInsightsSection: View {
    let users: [User]

    private var aggregatedSessions: [GameSession] {
        users.flatMap { $0.progress.sessions }
    }

    private var strugglingEmotions: [String] {
        // Simplified - questions not tracked in GameSession anymore
        // Would need different tracking approach
        return []
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Group trends")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Insights across your supervised learners to help plan interventions.")
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }

                GlassCard(padding: 20) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Emotions needing practice")
                            .font(.headline)
                            .foregroundStyle(.white)

                        if strugglingEmotions.isEmpty {
                            EmptyState(text: "We'll surface targeted practice ideas after a few more sessions.")
                        } else {
                            ForEach(strugglingEmotions, id: \.self) { emotion in
                                HStack {
                                    Text(emotion)
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.white)
                                    Spacer()
                                    Text("Low accuracy")
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.7))
                                }
                                .padding(.vertical, 6)
                            }
                        }
                    }
                }

                if !aggregatedSessions.isEmpty {
                    GlassCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Recent group wins")
                                .font(.headline)
                                .foregroundStyle(.white)

                            ForEach(aggregatedSessions.suffix(5).reversed()) { session in
                                HStack(alignment: .top, spacing: 12) {
                                    Capsule()
                                        .fill(Color.green.opacity(0.5))
                                        .frame(width: 6, height: 36)
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(session.startTime, formatter: DateFormatter.longDateShortTime)
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.6))
                                        Text("Score \(session.score), Accuracy \(Int(session.accuracy * 100))%")
                                            .font(.footnote)
                                            .foregroundStyle(.white)
                                    }
                                    Spacer()
                                }
                            }
                        }
                    }
                }

                Spacer(minLength: 40)
            }
            .padding(.bottom, 60)
        }
    }
}

// MARK: - Settings placeholder
private struct SettingsSection: View {
    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 20) {
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Settings")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Configure sharing preferences and alerts. More options coming soon.")
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }

                GlassCard(padding: 20) {
                    Toggle(isOn: .constant(true)) {
                        Text("Notify me when a learner finishes a session")
                            .foregroundStyle(.white)
                    }
                    .toggleStyle(SwitchToggleStyle(tint: .cyan))
                    .disabled(true)
                }

                GlassCard(padding: 20) {
                    Toggle(isOn: .constant(false)) {
                        Text("Automatically send weekly report to caregivers")
                            .foregroundStyle(.white)
                    }
                    .toggleStyle(SwitchToggleStyle(tint: .purple))
                    .disabled(true)
                }

                Spacer(minLength: 40)
            }
            .padding(.bottom, 60)
        }
    }
}

// MARK: - Supporting views
private struct EmptyState: View {
    let text: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "rectangle.and.pencil.and.ellipsis")
                .font(.title2)
                .foregroundStyle(.white.opacity(0.6))
            Text(text)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        )
    }
}

private struct AddUserSheet: View {
    @EnvironmentObject private var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var username = ""
    @State private var email = ""

    var body: some View {
        NavigationStack {
            ZStack {
                AuraBackground()
                VStack(spacing: 20) {
                    GlassCard {
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Add learner")
                                .font(.headline)
                                .foregroundStyle(.white)
                            TextField("Display name", text: $name)
                                .textFieldStyle(.roundedBorder)
                            TextField("Username", text: $username)
                                .textFieldStyle(.roundedBorder)
                            TextField("Email", text: $email)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.emailAddress)
                        }
                    }

                    GlassButton(style: .primary) {
                        guard let supervisor = authManager.currentUser else { return }
                        authManager.createStudent(username: username, email: email, displayName: name, supervisorId: supervisor.id)
                        dismiss()
                    } label: {
                        Label("Create Learner", systemImage: "person.crop.circle.badge.plus")
                    }
                    .disabled(name.isEmpty || username.isEmpty)
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                        .foregroundStyle(.white)
                }
            }
        }
    }
}

private struct ReportPreviewSheet: View {
    let report: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AuraBackground()
                ScrollView {
                    Text(report)
                        .font(.body.monospaced())
                        .foregroundStyle(.white)
                        .padding(24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                        .foregroundStyle(.white)
                }
            }
        }
    }
}
