import SwiftUI
import AVFoundation
import UIKit

struct GameView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var datasetManager = ImageDatasetManager()
    @StateObject private var audioManager = AudioManager()

    @State private var currentSession = GameSession(startTime: Date())
    @State private var currentQuestion: GameQuestion?
    @State private var questionStartTime = Date()
    @State private var showFeedback = false
    @State private var lastAnswerCorrect = false
    @State private var selectedEmotion: String?
    @State private var timeRemaining = 25.0
    @State private var timer: Timer?
    @State private var gameStarted = false
    @State private var showingSummary = false

    private let maxQuestionsPerSession = 8
    private let questionTimeLimit = 25.0

    private var playerProgress: PlayerProgress { authManager.currentProgress }

    var body: some View {
        // NavigationStack removed - ContentView already wraps this view in NavigationStack
        ZStack(alignment: .top) {
                AuraBackground()
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        headerBar
                        progressCard
                        questionPanel
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                    // .padding(.bottom, 140) ← REMOVED: Conflicts with safeAreaInset below
                }
                .safeAreaPadding(.top, 12)

                if showFeedback {
                    FeedbackOverlay(
                        isCorrect: lastAnswerCorrect,
                        correctAnswer: currentQuestion?.correctEmotion ?? "",
                        selectedAnswer: selectedEmotion ?? ""
                    )
                    .transition(.opacity)
                    .zIndex(1)
                }
            }
            .safeAreaInset(edge: .bottom) {
                statsStrip
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
            }
        .navigationTitle("Emotion Match")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Exit") { dismiss() }
                    .foregroundColor(.white)
            }
        }
        .onAppear { startGame() }
        .onDisappear {
            timer?.invalidate()
            audioManager.stopSpeaking()
        }
        .sheet(isPresented: $showingSummary) {
            GameCompleteView(
                session: currentSession,
                onPlayAgain: replayGame,
                onDone: { dismiss() }
            )
            .presentationDetents([.fraction(0.55), .medium])
        }
    }

    private var headerBar: some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Level \(playerProgress.currentLevel)")
                        .font(.title3.weight(.semibold))
                        .foregroundColor(.white)
                    Text("Score \(currentSession.score)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.75))
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 6) {
                    let questionNumber = min(currentSession.questionsAnswered + 1, maxQuestionsPerSession)
                    Text("Question \(questionNumber)/\(maxQuestionsPerSession)")
                        .font(.headline)
                        .foregroundColor(.white)
                    Text("Streak \(currentSession.currentStreak)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.75))
                }
            }
        }
    }

    private var progressCard: some View {
        GlassCard {
            VStack(spacing: 12) {
                ProgressView(value: Double(currentSession.questionsAnswered), total: Double(maxQuestionsPerSession))
                    .progressViewStyle(LinearProgressViewStyle(tint: .white))

                TimeBarView(timeRemaining: timeRemaining, totalTime: questionTimeLimit)
            }
        }
        .opacity(gameStarted ? 1 : 0.5)
    }

    @ViewBuilder
    private var questionPanel: some View {
        if let question = currentQuestion {
            VStack(spacing: 24) {
                GlassCard(cornerRadius: 30) {
                    QuestionImageView(question: question)
                        .frame(maxWidth: 320, maxHeight: 260)
                        .clipShape(RoundedRectangle(cornerRadius: 26))
                }

                GlassCard(cornerRadius: 24) {
                    EmotionSelectionGrid(selectedEmotion: $selectedEmotion, onEmotionSelected: handleEmotionSelection)
                }
            }
            .opacity(showFeedback ? 0.35 : 1)
        } else {
            GlassCard(cornerRadius: 28) {
                VStack(spacing: 12) {
                    ProgressView("Preparing your next challenge…")
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    Text("Loading real facial expressions")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.75))
                }
                .padding(.vertical, 34)
            }
        }
    }

    private var statsStrip: some View {
        GlassCard(cornerRadius: 26, padding: 0) {
            HStack(spacing: 0) {
                statTile(title: "Sessions", value: "\(playerProgress.totalSessions)")
                Divider().background(Color.white.opacity(0.24))
                statTile(title: "Accuracy", value: "\(Int(playerProgress.overallAccuracy * 100))%")
                Divider().background(Color.white.opacity(0.24))
                statTile(title: "Best Streak", value: "\(max(playerProgress.bestStreak, currentSession.maxStreak))")
            }
        }
    }

    private func statTile(title: String, value: String) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
    }

    private func startGame() {
        gameStarted = true
        showingSummary = false
        resetSession()
        loadNextQuestion()
        startTimer()
    }

    private func replayGame() {
        timer?.invalidate()
        startGame()
    }

    private func resetSession() {
        currentSession = GameSession(startTime: Date())
        selectedEmotion = nil
        showFeedback = false
        timeRemaining = questionTimeLimit
    }

    private func loadNextQuestion() {
        let unlocked = playerProgress.unlockedEmotions.map { $0.lowercased() }
        let supported = datasetManager.supportedEmotions
        let pool = unlocked.isEmpty ? supported : unlocked.filter { supported.contains($0) }
        guard let key = (pool.isEmpty ? supported : pool).randomElement() else {
            currentQuestion = nil
            return
        }

        var questions = datasetManager.loadImagesForEmotion(key)
        if !questions.isEmpty {
            questions.shuffle()
            currentQuestion = questions.first
        } else {
            currentQuestion = nil
        }

        questionStartTime = Date()
        selectedEmotion = nil
        timeRemaining = questionTimeLimit
        showFeedback = false
    }

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            guard gameStarted else { return }
            if timeRemaining > 0 {
                timeRemaining -= 0.1
            } else {
                handleTimeUp()
            }
        }
    }

    private func handleTimeUp() {
        if selectedEmotion == nil {
            handleEmotionSelection("")
        }
    }

    private func handleEmotionSelection(_ emotion: String) {
        guard let question = currentQuestion else { return }

        timer?.invalidate()
        selectedEmotion = emotion

        let responseTime = Date().timeIntervalSince(questionStartTime)
        let isCorrect = emotion.lowercased() == question.correctEmotion.lowercased()

        lastAnswerCorrect = isCorrect

        currentSession.recordAnswer(isCorrect: isCorrect, responseTime: responseTime)

        var points = 0
        if isCorrect {
            points = 100
            if responseTime < 5 { points += 50 }
            if currentSession.currentStreak > 0 {
                points += currentSession.currentStreak * 10
            }
        }

        currentSession.addScore(points)
        audioManager.playFeedback(isCorrect: isCorrect, emotion: question.correctEmotion)

        showFeedback = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) {
            if currentSession.questionsAnswered >= maxQuestionsPerSession {
                endGame()
            } else {
                loadNextQuestion()
                startTimer()
            }
        }
    }

    private func endGame() {
        timer?.invalidate()
        gameStarted = false
        currentSession.endSession()
        authManager.recordGameSession(currentSession)
        showFeedback = false
        currentQuestion = nil
        showingSummary = true
    }
}

struct EmotionSelectionGrid: View {
    @Binding var selectedEmotion: String?
    let onEmotionSelected: (String) -> Void

    private let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(Emotion.allEmotions) { emotion in
                GlassButton(style: selectedEmotion?.lowercased() == emotion.name.lowercased() ? .primary : .secondary) {
                    selectedEmotion = emotion.name
                    onEmotionSelected(emotion.name)
                } label: {
                    VStack(spacing: 6) {
                        Text(emotion.emoji)
                            .font(.system(size: 36))
                        Text(emotion.name)
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
}

// MARK: - Supporting Components

struct QuestionImageView: View {
    let question: GameQuestion

    var body: some View {
        Group {
            if let imageData = question.imageData, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "photo")
                        .font(.system(size: 60))
                        .foregroundColor(.white.opacity(0.5))
                    Text("Image not available")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.75))
                }
            }
        }
    }
}

struct FeedbackOverlay: View {
    let isCorrect: Bool
    let correctAnswer: String
    let selectedAnswer: String

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(isCorrect ? .green : .red)

                Text(isCorrect ? "Correct!" : "Not Quite")
                    .font(.title.bold())
                    .foregroundColor(.white)

                if !isCorrect {
                    Text("The correct answer was: \(correctAnswer)")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                }
            }
            .padding(40)
        }
    }
}

struct TimeBarView: View {
    let timeRemaining: Double
    let totalTime: Double

    var progress: Double {
        guard totalTime > 0 else { return 0 }
        return timeRemaining / totalTime
    }

    var barColor: Color {
        if progress > 0.5 { return .green }
        if progress > 0.25 { return .orange }
        return .red
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color.white.opacity(0.2))

                Rectangle()
                    .fill(barColor)
                    .frame(width: geometry.size.width * progress)
            }
            .cornerRadius(8)
        }
        .frame(height: 8)
    }
}

struct GameCompleteView: View {
    let session: GameSession
    let onPlayAgain: () -> Void
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Text("Session Complete!")
                .font(.title.bold())
                .foregroundColor(.white)

            VStack(spacing: 16) {
                StatRow(title: "Final Score", value: "\(session.score)")
                StatRow(title: "Accuracy", value: "\(Int(session.accuracy * 100))%")
                StatRow(title: "Questions", value: "\(session.correctAnswers)/\(session.questionsAnswered)")
                StatRow(title: "Best Streak", value: "\(session.maxStreak)")
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .cornerRadius(16)

            HStack(spacing: 16) {
                Button(action: onPlayAgain) {
                    Text("Play Again")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }

                Button(action: onDone) {
                    Text("Done")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray)
                        .cornerRadius(12)
                }
            }
        }
        .padding(24)
        .background(Color.black.opacity(0.9))
        .cornerRadius(20)
        .padding(.horizontal, 20)
    }
}

struct StatRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
                .foregroundColor(.white.opacity(0.75))
            Spacer()
            Text(value)
                .font(.headline)
                .foregroundColor(.white)
        }
    }
}
