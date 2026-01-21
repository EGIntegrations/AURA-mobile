import SwiftUI
import AVFoundation

/// Root entry for authenticated/unauthenticated flows.
struct ContentView: View {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var siriKitManager = SiriKitManager()

    @State private var showingGameView = false
    @State private var showingMimicryView = false
    @State private var showingProgressView = false
    @State private var showingVocabularyView = false
    @State private var showingAdminDashboard = false
    @State private var showingConversationView = false
    @State private var showingAPIKeyConfig = false

    private var playerProgress: PlayerProgress { authManager.currentProgress }

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                authenticatedExperience
                    .onAppear {
                        print("DEBUG [ContentView]: Showing authenticated experience")
                    }
            } else {
                AuthenticationView()
                    .environmentObject(authManager)
                    .onAppear {
                        print("DEBUG [ContentView]: Showing authentication view - isAuthenticated: \(authManager.isAuthenticated)")
                    }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .startGameCommand)) { _ in showingGameView = true }
        .onReceive(NotificationCenter.default.publisher(for: .practiceEmotionCommand)) { _ in showingVocabularyView = true }
        .onReceive(NotificationCenter.default.publisher(for: .checkProgressCommand)) { _ in showingProgressView = true }
        .onReceive(NotificationCenter.default.publisher(for: .helpCommand)) { _ in
            siriKitManager.speak("Welcome to AURA! Ask me to start a game, practice emotions, or check progress.")
        }
        .onAppear {
            authManager.createDemoData()
            requestAllPermissions()
        }
    }

    private var authenticatedExperience: some View {
        NavigationStack {
            ZStack {
                AuraBackground()
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 28) {
                        header()
                        progressCard
                        experienceTiles
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                    // .padding(.bottom, 160) ← REMOVED: Conflicts with safeAreaInset below
                }
                .safeAreaPadding(.top, 12)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                progressSnapshot
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
                    .background(Color.clear)
            }
            .navigationBarHidden(true)
            .toolbar { toolbarContent }
        }
        .sheet(isPresented: $showingProgressView) { PlayerProgressView().environmentObject(authManager) }
        .sheet(isPresented: $showingAdminDashboard) { AdminDashboardView().environmentObject(authManager) }
        .sheet(isPresented: $showingAPIKeyConfig) { apiKeySheet }
        .fullScreenCover(isPresented: $showingGameView) { NavigationStack { GameView().environmentObject(authManager) } }
        .fullScreenCover(isPresented: $showingVocabularyView) { NavigationStack { VocabularyWithSpeechView().environmentObject(authManager) } }
        .fullScreenCover(isPresented: $showingMimicryView) { NavigationStack { MimicryView().environmentObject(authManager) } }
        .fullScreenCover(isPresented: $showingConversationView) { ConversationPracticeView().environmentObject(authManager) }
    }

    private func header() -> some View {
        VStack(spacing: 8) {
            Text("AURA")
                .font(.system(size: 54, weight: .bold, design: .rounded))
                .foregroundStyle(LinearGradient(colors: [.white.opacity(0.95), .white.opacity(0.65)], startPoint: .leading, endPoint: .trailing))
                .shadow(color: .black.opacity(0.22), radius: 14, x: 0, y: 8)

            Text("Autism Understanding & Recognition Assistant")
                .font(.callout.weight(.semibold))
                .multilineTextAlignment(.center)
                .foregroundColor(.white.opacity(0.84))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("AURA – autism understanding and recognition assistant")
    }

    private var progressCard: some View {
        GlassCard(cornerRadius: 30) {
            HStack(spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Level \(playerProgress.currentLevel)")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.white)
                    Text("Total score \(playerProgress.totalScore)")
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.75))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 6) {
                    let accuracy = Int(playerProgress.overallAccuracy * 100)
                    Text("Accuracy \(accuracy)%")
                        .font(.title3.weight(.semibold))
                        .foregroundColor(.white)
                    Text("Best streak \(playerProgress.bestStreak)")
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.75))
                }
            }
        }
    }

    private var experienceTiles: some View {
        let columns = [GridItem(.adaptive(minimum: 160), spacing: 16, alignment: .top)]

        return LazyVGrid(columns: columns, spacing: 16) {
            tile(title: "Emotion Recognition", subtitle: "Practice identifying expressions", icon: "face.smiling", gradient: Gradient(colors: [.blue.opacity(0.9), .purple.opacity(0.75)])) {
                showingGameView = true
            }
            tile(title: "Speech Practice", subtitle: "Say the emotions you see", icon: "mic.fill", gradient: Gradient(colors: [.green.opacity(0.85), .teal.opacity(0.8)])) {
                showingVocabularyView = true
            }
            tile(title: "Facial Mimicry", subtitle: "Practice making expressions", icon: "camera.fill", gradient: Gradient(colors: [.orange.opacity(0.85), .pink.opacity(0.75)])) {
                showingMimicryView = true
            }
            tile(title: "AI Conversation", subtitle: "Simulate real conversations", icon: "waveform.and.mic", gradient: Gradient(colors: [.purple.opacity(0.85), .indigo.opacity(0.75)])) {
                showingConversationView = true
            }
            tile(title: "My Progress", subtitle: "Review mastery & insights", icon: "chart.bar.fill", gradient: Gradient(colors: [.gray.opacity(0.8), .blue.opacity(0.6)])) {
                showingProgressView = true
            }
        }
    }

    private func tile(title: String, subtitle: String, icon: String, gradient: Gradient, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 18) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.white)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline.weight(.bold))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundColor(.white.opacity(0.84))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.body.weight(.semibold))
                    .foregroundColor(.white.opacity(0.9))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 22)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: 32, style: .continuous)
                    .fill(LinearGradient(gradient: gradient, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .overlay(
                        RoundedRectangle(cornerRadius: 32, style: .continuous)
                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.2), radius: 22, x: 0, y: 12)
            )
        }
        .buttonStyle(.plain)
    }

    private var progressSnapshot: some View {
        GlassCard(cornerRadius: 28, padding: 0) {
            HStack(spacing: 0) {
                statTile(title: "Sessions", value: playerProgress.totalSessions)
                Divider().background(Color.white.opacity(0.24))
                statTile(title: "Unlocked", value: playerProgress.unlockedEmotions.count)
                Divider().background(Color.white.opacity(0.24))
                statTile(title: "Correct", value: playerProgress.totalCorrectAnswers)
            }
        }
    }

    private func statTile(title: String, value: Int) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.headline.weight(.semibold))
                .minimumScaleFactor(0.7)
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title): \(value)")
    }

    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .navigationBarTrailing) {
            Button { showingProgressView = true } label: {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundStyle(.white)
            }

            Menu {
                if authManager.currentUser?.hasPermission(.manageStudents) == true ||
                    authManager.currentUser?.hasPermission(.manageChildren) == true {
                    Button("Admin Dashboard") { showingAdminDashboard = true }
                }
                Button("API Keys") { showingAPIKeyConfig = true }
                Button(role: .destructive) {
                    BiometricAuthManager.shared.clearSavedUser()
                    authManager.signOut()
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "person.crop.circle")
                    .font(.title2)
                    .foregroundStyle(.white)
            }
        }
    }

    private var apiKeySheet: some View {
        NavigationView {
            VStack(spacing: 16) {
                Text("API Configuration")
                    .font(.title2.weight(.bold))
                Text("Configure API keys in Views/APIKeyConfigurationView.swift")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                Spacer()
                Button("Done") { showingAPIKeyConfig = false }
                    .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("API Keys")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func requestAllPermissions() {
        siriKitManager.requestSpeechPermission()
        AVCaptureDevice.requestAccess(for: .video) { _ in }
        AVCaptureDevice.requestAccess(for: .audio) { _ in }
    }
}
