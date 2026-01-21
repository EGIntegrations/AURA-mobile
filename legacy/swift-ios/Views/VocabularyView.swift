import SwiftUI
import Speech

struct VocabularyView: View {
    @StateObject private var siriKitManager = SiriKitManager()
    @StateObject private var imageDatasetManager = ImageDatasetManager()
    @Environment(\.dismiss) private var dismiss
    
    @State private var currentQuestion: GameQuestion?
    @State private var showFeedback = false
    @State private var feedbackMessage = ""
    @State private var isCorrect = false
    @State private var score = 0
    @State private var questionsCompleted = 0
    @State private var correctAnswers = 0
    
    private let maxQuestions = 5
    
    var body: some View {
        ZStack {
            backgroundGradient

            VStack(spacing: 20) {
                headerView
                progressBar
                    
                    if questionsCompleted >= maxQuestions {
                        // Results view
                        VStack(spacing: 20) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.yellow)
                            
                            Text("Great Job!")
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text("Final Score: \(score)")
                                .font(.title2)
                            
                            Text("Accuracy: \(Int(Double(correctAnswers) / Double(maxQuestions) * 100))%")
                                .font(.body)
                            
                            Button("Practice Again") {
                                resetPractice()
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding()
                    } else {
                        // Main content
                        if let question = currentQuestion {
                            VStack(spacing: 30) {
                                // Question image
                                VStack {
                                    if let imageData = question.imageData,
                                       let uiImage = UIImage(data: imageData) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .aspectRatio(contentMode: .fit)
                                            .frame(maxWidth: 300, maxHeight: 300)
                                            .background(Color.white)
                                            .clipShape(RoundedRectangle(cornerRadius: 20))
                                            .shadow(radius: 10)
                                    } else {
                                        RoundedRectangle(cornerRadius: 20)
                                            .fill(Color.gray.opacity(0.3))
                                            .frame(width: 300, height: 300)
                                            .overlay(
                                                VStack {
                                                    Image(systemName: "person.circle")
                                                        .font(.system(size: 60))
                                                        .foregroundColor(.gray)
                                                    Text("Sample Face")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                            )
                                    }
                                }
                                
                                Text("What emotion do you see?")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                // Manual input fallback
                                VStack(spacing: 10) {
                                    Text("Tap an emotion:")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 10) {
                                        ForEach(Emotion.allEmotions) { emotion in
                                            Button(action: {
                                                processAnswer(emotion.name)
                                            }) {
                                                VStack {
                                                    Text(emotion.emoji)
                                                        .font(.title2)
                                                    Text(emotion.name)
                                                        .font(.caption)
                                                        .fontWeight(.medium)
                                                }
                                                .frame(maxWidth: .infinity)
                                                .padding(.vertical, 8)
                                                .background(Color.gray.opacity(0.1))
                                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        } else {
                            ProgressView("Loading question...")
                                .progressViewStyle(CircularProgressViewStyle())
                        }
                    }
                    
                    Spacer()
                }
                
                // Feedback overlay
                if showFeedback {
                    VStack(spacing: 20) {
                        Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                            .font(.system(size: 80))
                            .foregroundColor(isCorrect ? .green : .red)
                        
                        Text(feedbackMessage)
                            .font(.title2)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .background(Color.white.opacity(0.9))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(radius: 10)
                }
            }
            .navigationTitle("Vocabulary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        .onAppear {
            loadNextQuestion()
        }
    }
    
    private func processAnswer(_ answer: String) {
        guard let question = currentQuestion else { return }
        
        let correct = answer.lowercased() == question.correctEmotion.lowercased()
        
        if correct {
            score += 100
            correctAnswers += 1
            showFeedback(message: "Correct! That's \(question.correctEmotion)!", correct: true)
        } else {
            showFeedback(message: "The correct answer is \(question.correctEmotion)", correct: false)
        }
        
        questionsCompleted += 1
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            if questionsCompleted < maxQuestions {
                loadNextQuestion()
            }
        }
    }
    
    private func showFeedback(message: String, correct: Bool) {
        feedbackMessage = message
        isCorrect = correct
        showFeedback = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            showFeedback = false
        }
    }
    
    private func loadNextQuestion() {
        let allQuestions = imageDatasetManager.getAllQuestions()
        currentQuestion = allQuestions.randomElement()
        showFeedback = false
    }
    
    private func resetPractice() {
        score = 0
        questionsCompleted = 0
        correctAnswers = 0
        loadNextQuestion()
    }

    // MARK: - View Components
    private var backgroundGradient: some View {
        LinearGradient(
            gradient: Gradient(colors: [.green.opacity(0.1), .blue.opacity(0.1)]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading) {
                Text("Vocabulary Practice")
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
        .padding()
    }

    private var progressBar: some View {
        ProgressView(value: Double(questionsCompleted) / Double(maxQuestions))
            .progressViewStyle(LinearProgressViewStyle(tint: .green))
            .padding(.horizontal)
    }
}

class SpeechRecognitionManager: ObservableObject {
    // Simplified for MVP - just processing text input for now
    func matchEmotionFromSpeech(_ speech: String) -> String? {
        let lowercased = speech.lowercased()
        let emotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        
        for emotion in emotions {
            if lowercased.contains(emotion) {
                return emotion
            }
        }
        
        return nil
    }
}

#Preview {
    VocabularyView()
}