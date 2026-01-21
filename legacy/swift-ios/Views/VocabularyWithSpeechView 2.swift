import SwiftUI
import Speech
import UIKit

struct VocabularyWithSpeechView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss

    @StateObject private var siriKitManager = SiriKitManager()
    @StateObject private var datasetManager = ImageDatasetManager()

    @State private var currentQuestion: GameQuestion?
    @State private var showFeedback = false
    @State private var feedbackMessage = ""
    @State private var isCorrect = false
    @State private var score = 0
    @State private var questionsCompleted = 0
    @State private var correctAnswers = 0
    @State private var showingInstructions = true
    @State private var showingSummary = false
    @State private var isListening = false

    private let maxQuestions = 6

    private var playerProgress: PlayerProgress {
        authManager.currentProgress
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AuraBackground()

                if showingInstructions {
                    instructionsView
                        .transition(.opacity)
                } else {
                    mainContentView
                        .transition(.opacity)
                }

                if showFeedback {
                    feedbackOverlay
                }
            }
            .navigationTitle("Speech Practice")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        siriKitManager.stopListening()
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            siriKitManager.requestSpeechPermission()
        }
        .sheet(isPresented: $showingSummary) {
            SpeechPracticeSummaryView(
                score: score,
                totalQuestions: maxQuestions,
                correctAnswers: correctAnswers,
                onReplay: restartPractice,
                onDone: { dismiss() }
            )
            .presentationDetents([.fraction(0.55), .medium])
        }
        .onChange(of: siriKitManager.recognizedEmotion) { _, emotion in
            guard let emotion else { return }
            processVoiceAnswer(emotion)
        }
    }

    private var instructionsView: some View {
        VStack(spacing: 28) {
            GlassCard {
                VStack(spacing: 16) {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(LinearGradient(colors: [.cyan, .blue.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))

                    Text("Voice Practice")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)

                    Text("Use your voice to identify emotions")
                        .font(.title3)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white.opacity(0.85))
                        .padding(.horizontal)
                }
            }

            GlassCard {
                VStack(alignment: .leading, spacing: 16) {
                    Text("How it works")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.9))
                    instructionRow(icon: "1.circle.fill", text: "Look closely at the expression")
                    instructionRow(icon: "2.circle.fill", text: "Tap the microphone and say the emotion")
                    instructionRow(icon: "3.circle.fill", text: "We listen and give voice feedback")
                }
            }

            GlassButton(style: .primary) {
                startPractice()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "play.circle")
                    Text("Start Practice")
                }
            }
        }
        .padding(.horizontal, 24)
    }

    private func instructionRow(icon: String, text: String) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(LinearGradient(colors: [.cyan.opacity(0.95), .blue.opacity(0.75)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .font(.title3)
            Text(text)
                .font(.body.weight(.medium))
                .foregroundStyle(.white.opacity(0.9))
        }
    }

    private var mainContentView: some View {
        VStack(spacing: 24) {
            GlassCard {
                header
            }

            GlassCard(padding: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Progress")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.85))
                    ProgressView(value: Double(questionsCompleted), total: Double(maxQuestions))
                        .progressViewStyle(LinearProgressViewStyle(tint: .green.opacity(0.8)))
                    Text("\(questionsCompleted) of \(maxQuestions) prompts")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.75))
                }
            }

            if questionsCompleted >= maxQuestions {
                resultsView
                    .transition(.scale)
            } else {
                gameContent
            }

            Spacer(minLength: 22)
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("Speech Practice")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Say the emotion you see")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text("Score: \(score)")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("\(questionsCompleted)/\(maxQuestions)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal)
        .padding(.top, 12)
    }

    private var gameContent: some View {
        VStack(spacing: 26) {
            if let question = currentQuestion {
                GlassCard(padding: 18) {
                    QuestionImageView(question: question)
                        .frame(maxWidth: 280, maxHeight: 280)
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                        .overlay(
                            RoundedRectangle(cornerRadius: 22)
                                .stroke(.white.opacity(0.25), lineWidth: 1)
                        )
                }
            }

            GlassCard(padding: 16) {
                VStack(spacing: 18) {
                    if isListening {
                        listeningIndicator
                    } else {
                        microphoneButton
                    }

                    if !siriKitManager.transcribedText.isEmpty {
                        transcriptionView
                    }
                }
            }

            GlassCard(padding: 18) {
                fallbackButtons
            }
        }
        .padding(.horizontal, 22)
    }

    private var listeningIndicator: some View {
        VStack(spacing: 12) {
            Image(systemName: "mic.fill")
                .font(.system(size: 46))
                .foregroundStyle(LinearGradient(colors: [.red, .orange.opacity(0.9)], startPoint: .topLeading, endPoint: .bottomTrailing))
                .scaleEffect(1.05)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isListening)
            Text("Listening…")
                .font(.headline)
                .foregroundStyle(.white.opacity(0.9))

            GlassButton(style: .danger) {
                stopListening()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "stop.circle")
                    Text("Stop")
                }
            }
            .controlSize(.small)
        }
    }

    private var microphoneButton: some View {
        GlassButton(style: .primary) {
            startListening()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "mic.circle.fill")
                    .font(.system(size: 44))
                Text("Tap to Speak")
            }
        }
    }

    private var transcriptionView: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("You said")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.75))
            Text("\"\(siriKitManager.transcribedText)\"")
                .font(.body.weight(.medium))
                .foregroundStyle(.white)
                .padding(.vertical, 12)
                .padding(.horizontal, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white.opacity(0.08))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                )
        }
    }

    private var fallbackButtons: some View {
        VStack(spacing: 16) {
            Text("Or pick an emotion")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.75))

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 3), spacing: 14) {
                ForEach(Emotion.allEmotions) { emotion in
                    GlassButton(style: .secondary) {
                        processVoiceAnswer(emotion.name)
                    } label: {
                        VStack(spacing: 6) {
                            Text(emotion.emoji)
                                .font(.title2)
                            Text(emotion.name)
                                .font(.caption.weight(.semibold))
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }

    private var feedbackOverlay: some View {
        GlassCard(padding: 28) {
            VStack(spacing: 18) {
                Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 70))
                    .foregroundStyle(isCorrect ? LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing) : LinearGradient(colors: [.red, .pink], startPoint: .topLeading, endPoint: .bottomTrailing))
                Text(feedbackMessage)
                    .font(.title3)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)
            }
        }
    }

    private var resultsView: some View {
        GlassCard {
            VStack(spacing: 18) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(LinearGradient(colors: [.yellow, .orange], startPoint: .top, endPoint: .bottom))
                Text("Great work!")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                Text("Score: \(score)")
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.9))
                Text("Accuracy: \(Int((Double(correctAnswers) / Double(maxQuestions)) * 100))%")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.85))
                GlassButton(style: .primary) {
                    finalizePractice()
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "doc.text.magnifyingglass")
                        Text("See Summary")
                    }
                }
            }
        }
    }

    // MARK: - Interaction helpers

    private func startPractice() {
        resetSession()
        withAnimation {
            showingInstructions = false
        }
        loadNextQuestion()
    }

    private func restartPractice() {
        resetSession()
        showingSummary = false
        loadNextQuestion()
    }

    private func resetSession() {
        siriKitManager.stopListening()
        siriKitManager.transcribedText = ""
        siriKitManager.recognizedEmotion = nil
        currentQuestion = nil
        showFeedback = false
        feedbackMessage = ""
        isCorrect = false
        score = 0
        questionsCompleted = 0
        correctAnswers = 0
        isListening = false
    }

    private func startListening() {
        siriKitManager.startListening()
        isListening = true
    }

    private func stopListening() {
        siriKitManager.stopListening()
        isListening = false
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
        questions.shuffle()
        currentQuestion = questions.first
        siriKitManager.transcribedText = ""
    }

    private func processVoiceAnswer(_ answer: String) {
        guard questionsCompleted < maxQuestions, let question = currentQuestion else { return }

        stopListening()
        siriKitManager.recognizedEmotion = nil

        let normalizedAnswer = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        let isMatch = normalizedAnswer.lowercased() == question.correctEmotion.lowercased()

        isCorrect = isMatch
        feedbackMessage = isMatch ? "Correct!" : "That was \(question.correctEmotion)"

        if isMatch {
            correctAnswers += 1
            score += 100
        } else {
            score = max(score - 25, 0)
        }

        questionsCompleted += 1
        siriKitManager.transcribedText = ""
        showTemporaryFeedback()

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
            showFeedback = false
            if questionsCompleted < maxQuestions {
                loadNextQuestion()
            } else {
                finalizePractice()
            }
        }
    }

    private func showTemporaryFeedback() {
        withAnimation {
            showFeedback = true
        }
    }

    private func finalizePractice() {
        guard !showingSummary else { return }
        let result = SpeechPracticeResult(
            date: Date(),
            totalPrompts: maxQuestions,
            correctResponses: correctAnswers,
            score: score
        )
        authManager.recordSpeechPractice(result)

        // Record the correct emotion as unlocked
        if let question = currentQuestion {
            authManager.recordUnlockedEmotion(question.correctEmotion.capitalized)
        }
        showingSummary = true
    }
}

private struct SpeechPracticeSummaryView: View {
    let score: Int
    let totalQuestions: Int
    let correctAnswers: Int
    let onReplay: () -> Void
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 10) {
                Image(systemName: "waveform.circle.fill")
                    .font(.system(size: 56))
                    .foregroundColor(.green)
                Text("Speech Session Complete")
                    .font(.title3)
                    .fontWeight(.bold)
            }

            VStack(spacing: 8) {
                Text("Score: \(score)")
                    .font(.headline)
                Text("Accuracy: \(Int((Double(correctAnswers) / Double(totalQuestions)) * 100))%")
                    .font(.subheadline)
                Text("Correct answers: \(correctAnswers)/\(totalQuestions)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 14) {
                Button(action: onDone) {
                    Text("Done")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button(action: onReplay) {
                    Text("Practice Again")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(24)
    }
}
