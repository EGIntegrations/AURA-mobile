import SwiftUI
import AVFoundation

struct MimicryView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @StateObject private var cameraManager = CameraManager()
    @StateObject private var facePipeline = FacePipeline()
    @StateObject private var audioManager = AudioManager()
    @StateObject private var datasetManager = ImageDatasetManager()
    @Environment(\.dismiss) private var dismiss

    @State private var targetEmotion = "Happy"
    @State private var isRecognizing = false
    @State private var currentScore = 0
    @State private var targetEmotionIndex = 0
    @State private var showSuccess = false
    @State private var detectedEmotion = ""
    @State private var confidence: Double = 0.0
    @State private var roundsCompleted = 0
    @State private var maxRounds = 5
    @State private var referenceImage: UIImage?
    @State private var cumulativeConfidence: Double = 0.0
    @State private var successfulRounds = 0
    @State private var hasFinalizedSession = false

    private let emotions = ["Happy", "Sad", "Angry", "Surprised", "Neutral"]

    var body: some View {
        // NavigationStack removed - ContentView already wraps this view in NavigationStack
        ZStack(alignment: .top) {
                CameraView(cameraManager: cameraManager)
                    .ignoresSafeArea()

                LinearGradient(colors: [.black.opacity(0.55), .clear], startPoint: .top, endPoint: .center)
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        header

                        GlassCard(cornerRadius: 28) {
                            VStack(spacing: 18) {
                                Text("Make this expression:")
                                    .font(.title3.weight(.bold))
                                    .foregroundColor(.white)
                                expressionReference
                                Text(targetEmotion)
                                    .font(.title.weight(.bold))
                                    .foregroundColor(.white)
                            }
                        }

                        detectionCard
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 32)
                    // .padding(.bottom, 24) ← REMOVED: Conflicts with safeAreaInset below
                }
                .safeAreaPadding(.top, 12)

                if showSuccess {
                    SuccessOverlay(
                        targetEmotion: targetEmotion,
                        onContinue: {
                            showSuccess = false
                            nextEmotion()
                        }
                    )
                }
            }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            controlBar
                .padding(.horizontal, 24)
                .padding(.vertical, 16)
                .background(.ultraThinMaterial)
        }
        .onAppear {
            setupCamera()
            startNewRound()
        }
        .onDisappear {
            if !hasFinalizedSession {
                finalizeSession()
            } else {
                cleanup()
            }
        }
        .navigationBarHidden(true)
    }

    private var header: some View {
        HStack {
            Button {
                if !hasFinalizedSession { finalizeSession() }
                cleanup()
                dismiss()
            } label: {
                Label("Done", systemImage: "xmark.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
            .background(Color.white.opacity(0.18), in: Capsule())

            Spacer()

            GlassCard(cornerRadius: 22) {
                HStack(alignment: .center, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Score")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.75))
                        Text("\(currentScore)")
                            .font(.title3.weight(.bold))
                            .foregroundColor(.white)
                    }

                    Divider().frame(height: 32).background(Color.white.opacity(0.3))

                    VStack(alignment: .trailing, spacing: 6) {
                        Text("Round")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.75))
                        Text("\(roundsCompleted + 1)/\(maxRounds)")
                            .font(.title3.weight(.semibold))
                            .foregroundColor(.white)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var expressionReference: some View {
        if let image = referenceImage {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 200)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .shadow(radius: 12)
        } else {
            Text(getEmojiForEmotion(targetEmotion))
                .font(.system(size: 104))
        }
    }

    private var detectionCard: some View {
        Group {
            if isRecognizing {
                GlassCard(cornerRadius: 26) {
                    VStack(spacing: 12) {
                        Text("Detected: \(detectedEmotion.isEmpty ? "—" : detectedEmotion)")
                            .font(.headline)
                            .foregroundColor(.white)

                        ProgressView(value: confidence, total: 1.0)
                            .progressViewStyle(LinearProgressViewStyle(tint: .white))

                        Text("Confidence: \(Int(confidence * 100))%")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.75))
                    }
                }
            }
        }
    }

    private var controlBar: some View {
        HStack(spacing: 20) {
            Button {
                isRecognizing ? stopRecognition() : startRecognition()
            } label: {
                HStack {
                    Image(systemName: isRecognizing ? "stop.circle.fill" : "play.circle.fill")
                    Text(isRecognizing ? "Stop" : "Start")
                        .fontWeight(.semibold)
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 22)
                .background(
                    RoundedRectangle(cornerRadius: 22)
                        .fill(isRecognizing ? Color.red.opacity(0.8) : Color.green.opacity(0.85))
                )
                .foregroundColor(.white)
            }

            Button {
                nextEmotion()
            } label: {
                HStack {
                    Image(systemName: "arrow.right.circle.fill")
                    Text("Next")
                        .fontWeight(.semibold)
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 22)
                .background(
                    RoundedRectangle(cornerRadius: 22)
                        .fill(Color.blue.opacity(0.8))
                )
                .foregroundColor(.white)
            }
        }
    }

    private func setupCamera() {
        cameraManager.checkPermissions { granted in
            if granted {
                DispatchQueue.main.async {
                    cameraManager.startSession()
                    facePipeline.startDetection(cameraManager: cameraManager)
                }
            }
        }
    }

    private func startRecognition() {
        isRecognizing = true
        facePipeline.onEmotionDetected = { emotion, confidence in
            DispatchQueue.main.async {
                self.detectedEmotion = emotion
                self.confidence = confidence
                if emotion.lowercased() == targetEmotion.lowercased() && confidence > 0.7 {
                    handleSuccessfulMatch()
                }
            }
        }
    }

    private func stopRecognition() {
        isRecognizing = false
        facePipeline.onEmotionDetected = nil
    }

    private func handleSuccessfulMatch() {
        stopRecognition()
        currentScore += 100
        audioManager.playFeedback(isCorrect: true, emotion: targetEmotion)
        cumulativeConfidence += confidence
        successfulRounds += 1

        withAnimation(.spring()) {
            showSuccess = true
        }
    }

    private func nextEmotion() {
        roundsCompleted += 1

        if roundsCompleted >= maxRounds {
            finalizeSession()
            dismiss()
        } else {
            targetEmotionIndex = (targetEmotionIndex + 1) % emotions.count
            targetEmotion = emotions[targetEmotionIndex]
            audioManager.playEmotionDescription(targetEmotion)
            loadReferenceImage()
        }
    }

    private func startNewRound() {
        cumulativeConfidence = 0
        successfulRounds = 0
        hasFinalizedSession = false
        targetEmotion = emotions[targetEmotionIndex]
        audioManager.playEmotionDescription(targetEmotion)
        loadReferenceImage()
    }

    private func loadReferenceImage() {
        Task {
            let images = await Task { datasetManager.loadImagesForEmotion(targetEmotion) }.value
            if let question = images.first,
               let data = question.imageData,
               let uiImage = UIImage(data: data) {
                await MainActor.run { referenceImage = uiImage }
            } else {
                await loadLocalReferenceImage()
            }
        }
    }

    private func loadLocalReferenceImage() async {
        do {
            let questions = await Task { datasetManager.loadImagesForEmotion(targetEmotion) }.value
            if let question = questions.first,
               let data = question.imageData,
               let image = UIImage(data: data) {
                await MainActor.run { referenceImage = image }
            } else {
                await MainActor.run { referenceImage = nil }
            }
        } catch {
            await MainActor.run { referenceImage = nil }
        }
    }

    private func cleanup() {
        isRecognizing = false
        facePipeline.stopDetection()
        cameraManager.stopSession()
        audioManager.stopSpeaking()
        showSuccess = false
        detectedEmotion = ""
        confidence = 0
        referenceImage = nil
    }

    private func finalizeSession() {
        guard !hasFinalizedSession else { return }
        hasFinalizedSession = true
        let averageConfidence = successfulRounds > 0 ? cumulativeConfidence / Double(successfulRounds) : 0
        let session = MimicrySession(
            date: Date(),
            roundsCompleted: roundsCompleted,
            averageConfidence: averageConfidence,
            score: currentScore
        )
        authManager.recordMimicrySession(session)
        cleanup()
    }

    private func getEmojiForEmotion(_ emotion: String) -> String {
        switch emotion {
        case "Happy": return "😊"
        case "Sad": return "😢"
        case "Angry": return "😠"
        case "Surprised": return "😮"
        case "Neutral": return "😐"
        default: return "🙂"
        }
    }
}

struct SuccessOverlay: View {
    let targetEmotion: String
    let onContinue: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)

                Text("Perfect!")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)

                Text("You matched the \(targetEmotion) expression!")
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)

                Button(action: onContinue) {
                    Text("Continue")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)
                .padding(.top, 20)
            }
            .padding(40)
        }
    }
}
