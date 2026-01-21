import SwiftUI
import Charts

/// Glass-themed dashboard summarising learner progress, streaks, and emotion mastery.
struct PlayerProgressView: View {
    @EnvironmentObject private var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss

    @State private var progress: PlayerProgress = .init()
    @State private var selectedMedal: MedalTier?

    private var sessions: [GameSession] { progress.sessions }
    private var speechHistory: [SpeechPracticeResult] { progress.speechPracticeHistory }
    private var conversations: [ConversationSummary] { progress.conversationSessions }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AuraBackground()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 26) {
                        headlineCard
                        statsGrid
                        accuracyTrend
                        streakMedalSection
                        emotionMasterySection
                        recentSessionsSection
                    }
                    .padding(.horizontal, 22)
                    .padding(.top, 26)
                    .padding(.bottom, 44)
                }
            }
            .navigationTitle("My Progress")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done", action: dismiss.callAsFunction)
                        .foregroundStyle(.white)
                }
            }
        }
        .onAppear(perform: refresh)
        .onReceive(authManager.$currentUser) { _ in refresh() }
    }

    private func refresh() {
        progress = authManager.currentProgress
    }
}

// MARK: - Sections
private extension PlayerProgressView {
    var headlineCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 18) {
                Text("Level \(progress.currentLevel)")
                    .font(.system(size: 32, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)

                VStack(alignment: .leading, spacing: 8) {
                    ProgressView(value: levelProgressFraction)
                        .progressViewStyle(LinearProgressViewStyle(tint: .cyan))
                        .scaleEffect(x: 1, y: 1.1, anchor: .center)

                    HStack {
                        Text("Next level in \(pointsUntilNextLevel) XP")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.75))
                        Spacer()
                        Text("Total XP \(progress.totalScore)")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }
            }
        }
    }

    var statsGrid: some View {
        GlassCard(padding: 20) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 130), spacing: 18)], spacing: 18) {
                StatPill(icon: "gamecontroller", title: "Sessions", value: "\(progress.totalSessions)")
                StatPill(icon: "checkmark.circle", title: "Accuracy", value: "\(accuracyPercentage)%")
                StatPill(icon: "flame", title: "Best Streak", value: "\(progress.bestStreak)")
                StatPill(icon: "mic", title: "Speech", value: "\(speechHistory.count)")
                StatPill(icon: "bubble", title: "Chats", value: "\(conversations.count)")
            }
        }
    }

    var accuracyTrend: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Label("Accuracy Trend", systemImage: "chart.line.uptrend.xyaxis")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Spacer()
                    Text("Last 7 sessions")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.65))
                }

                if recentAccuracyPoints.isEmpty {
                    EmptyState(text: "Run a few sessions to see accuracy progress.")
                } else {
                    Chart(recentAccuracyPoints) { point in
                        LineMark(x: .value("Session", point.label), y: .value("Accuracy", point.accuracy))
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(Gradient(colors: [.cyan, .blue]))

                        AreaMark(x: .value("Session", point.label), y: .value("Accuracy", point.accuracy))
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(Gradient(colors: [.cyan.opacity(0.35), .clear]))

                        PointMark(x: .value("Session", point.label), y: .value("Accuracy", point.accuracy))
                            .symbolSize(70)
                            .foregroundStyle(.white)
                    }
                    .chartYScale(domain: 0...100)
                    .frame(height: 180)
                }
            }
        }
    }

    var streakMedalSection: some View {
        GlassCard(padding: 20) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Streak Medal")
                    .font(.headline)
                    .foregroundStyle(.white)

                HStack(spacing: 18) {
                    ForEach(MedalTier.allCases) { tier in
                        MedalBadge(tier: tier, isActive: tier == currentMedal)
                            .onTapGesture { selectedMedal = tier }
                    }
                }

                Text(currentMedal.description)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.75))
            }
        }
        .sheet(item: $selectedMedal) { medal in
            MedalDetailSheet(medal: medal)
                .presentationDetents([.fraction(0.35)])
        }
    }

    var emotionMasterySection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Label("Emotion Mastery", systemImage: "face.smiling")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Spacer()
                    Text("Unlocked: \(progress.unlockedEmotions.count)/6")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(Emotion.allEmotions) { emotion in
                        EmotionMasteryTile(emotion: emotion, stats: stats(for: emotion))
                    }
                }
            }
        }
    }

    var recentSessionsSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Label("Recent Sessions", systemImage: "clock")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Spacer()
                    Text("Most recent 4")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }

                if sessions.isEmpty {
                    EmptyState(text: "Your completed sessions will appear here.")
                } else {
                    VStack(spacing: 14) {
                        ForEach(sessions.suffix(4).reversed()) { session in
                            SessionRow(session: session)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Helpers
private extension PlayerProgressView {
    var accuracyPercentage: Int {
        guard progress.totalQuestions > 0 else { return 0 }
        return Int((progress.overallAccuracy * 100).rounded())
    }

    var levelProgressFraction: Double {
        let minXP = Double((progress.currentLevel - 1) * 1000)
        let maxXP = Double(progress.currentLevel * 1000)
        guard maxXP > minXP else { return 0 }
        return min(max((Double(progress.totalScore) - minXP) / (maxXP - minXP), 0), 1)
    }

    var pointsUntilNextLevel: Int {
        max(progress.currentLevel * 1000 - progress.totalScore, 0)
    }

    var currentMedal: MedalTier {
        switch progress.bestStreak {
        case 0..<5: return .bronze
        case 5..<10: return .silver
        case 10..<20: return .gold
        default: return .platinum
        }
    }

    var recentAccuracyPoints: [AccuracyPoint] {
        guard !sessions.isEmpty else { return [] }
        let trimmed = Array(sessions.suffix(7))
        return trimmed.enumerated().map { offset, session in
            AccuracyPoint(label: "S\(trimmed.count - offset)", accuracy: Int(session.accuracy * 100))
        }
    }

    func stats(for emotion: Emotion) -> EmotionMasteryStats {
        let unlocked = progress.unlockedEmotions.contains(emotion.name)
        // Simplified - questions not tracked in GameSession anymore
        let total = 0
        let correct = 0
        let accuracy = progress.overallAccuracy // Use overall accuracy as approximation
        let recentAccuracy: Double? = nil

        return EmotionMasteryStats(isUnlocked: unlocked, totalAttempts: total, accuracy: accuracy, recentAccuracy: recentAccuracy)
    }
}

// MARK: - Local Models
private struct AccuracyPoint: Identifiable {
    let id = UUID()
    let label: String
    let accuracy: Int
}

struct EmotionMasteryStats {
    let isUnlocked: Bool
    let totalAttempts: Int
    let accuracy: Double
    let recentAccuracy: Double?

    var statusText: String {
        guard totalAttempts > 0 else { return "Not attempted yet" }
        if accuracy >= 0.85 { return "Mastered" }
        if accuracy >= 0.65 { return "Improving" }
        return "Needs practice"
    }

    var statusColor: Color {
        guard totalAttempts > 0 else { return .white.opacity(0.55) }
        if accuracy >= 0.85 { return .green }
        if accuracy >= 0.65 { return .yellow }
        return .orange
    }

    var trendIcon: String {
        guard let recentAccuracy else { return "minus" }
        if recentAccuracy >= accuracy { return "arrow.up" }
        return "arrow.down"
    }
}

enum MedalTier: String, CaseIterable, Identifiable {
    case bronze, silver, gold, platinum

    var id: String { rawValue }

    var gradient: Gradient {
        switch self {
        case .bronze: return Gradient(colors: [.brown.opacity(0.9), .brown.opacity(0.6)])
        case .silver: return Gradient(colors: [.gray.opacity(0.9), .gray.opacity(0.6)])
        case .gold: return Gradient(colors: [.yellow, .orange])
        case .platinum: return Gradient(colors: [.white, .blue.opacity(0.5)])
        }
    }

    var description: String {
        switch self {
        case .bronze: return "Keep building daily streaks to earn higher medals."
        case .silver: return "Nice consistency! Maintain momentum for gold."
        case .gold: return "Excellent streak! One more push to reach platinum."
        case .platinum: return "Incredible dedication! You're at the top tier."
        }
    }
}

// MARK: - Reusable Components
private struct StatPill: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white.opacity(0.75))
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
    }
}

private struct EmptyState: View {
    let text: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
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
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.white.opacity(0.18), lineWidth: 1)
        )
    }
}

private struct MedalBadge: View {
    let tier: MedalTier
    let isActive: Bool

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(AngularGradient(gradient: tier.gradient, center: .center))
                    .frame(width: isActive ? 74 : 60)
                    .overlay(
                        Circle().stroke(.white.opacity(0.7), lineWidth: isActive ? 3 : 2)
                    )
                    .shadow(color: .black.opacity(0.25), radius: isActive ? 12 : 6, x: 0, y: 6)

                Image(systemName: symbol)
                    .font(.system(size: isActive ? 30 : 24, weight: .bold))
                    .foregroundStyle(.white)
            }

            Text(tier.rawValue.capitalized)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(isActive ? 1 : 0.7))
        }
        .padding(.vertical, isActive ? 6 : 0)
        .animation(.spring(dampingFraction: 0.65), value: isActive)
    }

    private var symbol: String {
        switch tier {
        case .bronze: return "1.circle"
        case .silver: return "2.circle"
        case .gold: return "3.circle"
        case .platinum: return "star.circle"
        }
    }
}

private struct MedalDetailSheet: View {
    let medal: MedalTier

    var body: some View {
        ZStack {
            AuraBackground()
            VStack(spacing: 20) {
                Capsule()
                    .fill(Color.white.opacity(0.35))
                    .frame(width: 44, height: 5)
                    .padding(.top, 10)

                MedalBadge(tier: medal, isActive: true)

                Text(medal.description)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 26)

                Text("Maintain your streak by completing at least one practice daily. Teachers can define streak goals from the dashboard.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.75))
                    .padding(.horizontal, 26)

                Spacer()
            }
        }
        .presentationBackground(.clear)
    }
}

private struct EmotionMasteryTile: View {
    let emotion: Emotion
    let stats: EmotionMasteryStats

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text(emotion.emoji)
                    .font(.title2)
                VStack(alignment: .leading, spacing: 2) {
                    Text(emotion.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(stats.statusText)
                        .font(.caption)
                        .foregroundStyle(stats.statusColor)
                }
                Spacer()
            }

            HStack(spacing: 12) {
                Label("\(Int(stats.accuracy * 100))%", systemImage: "target")
                Label("\(stats.totalAttempts)", systemImage: "number")
                Image(systemName: stats.trendIcon)
            }
            .font(.caption)
            .foregroundStyle(.white.opacity(0.75))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white.opacity(0.07))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(stats.isUnlocked ? 0.25 : 0.12), lineWidth: 1)
                )
        )
    }
}

private struct SessionRow: View {
    let session: GameSession

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text(session.startTime, formatter: DateFormatter.longDateShortTime)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                HStack(spacing: 10) {
                    Label("Score \(session.score)", systemImage: "sparkles")
                    Label("\(Int(session.accuracy * 100))%", systemImage: "checkmark.seal")
                    Label("Streak \(session.maxStreak)", systemImage: "flame")
                }
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
            }
            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.white.opacity(0.45))
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )
        )
    }
}

extension DateFormatter {
    static let longDateShortTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}

