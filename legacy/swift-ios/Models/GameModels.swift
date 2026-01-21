import Foundation
import SwiftUI

// MARK: - Game Session Models

struct GameSession: Identifiable, Codable {
    var id = UUID()
    let startTime: Date
    var endTime: Date?
    var score: Int = 0
    var questionsAnswered: Int = 0
    var correctAnswers: Int = 0
    var currentStreak: Int = 0
    var maxStreak: Int = 0
    var timeBonus: Int = 0
    // Questions handled separately to avoid Codable complexity
    var responseTimes: [TimeInterval] = []
    
    var accuracy: Double {
        guard questionsAnswered > 0 else { return 0.0 }
        return Double(correctAnswers) / Double(questionsAnswered)
    }
    
    var averageResponseTime: Double {
        guard !responseTimes.isEmpty else { return 0.0 }
        return responseTimes.reduce(0, +) / Double(responseTimes.count)
    }
    
    var isComplete: Bool {
        endTime != nil
    }
    
    mutating func addScore(_ points: Int) {
        score += points
    }
    
    mutating func recordAnswer(isCorrect: Bool, responseTime: TimeInterval) {
        questionsAnswered += 1
        responseTimes.append(responseTime)
        
        if isCorrect {
            correctAnswers += 1
            currentStreak += 1
            maxStreak = max(maxStreak, currentStreak)
            
            // Time bonus: faster responses get more points
            if responseTime < 2.0 {
                timeBonus += 50
            } else if responseTime < 5.0 {
                timeBonus += 25
            }
        } else {
            currentStreak = 0
        }
    }
    
    mutating func endSession() {
        endTime = Date()
    }
}

struct PlayerProgress: Codable {
    var totalScore: Int = 0
    var totalSessions: Int = 0
    var totalCorrectAnswers: Int = 0
    var totalQuestions: Int = 0
    var bestStreak: Int = 0
    var currentLevel: Int = 1
    var unlockedEmotions: Set<String> = ["Happy", "Sad", "Neutral"]
    var preferredDifficulty: Int = 1
    var sessions: [GameSession] = []
    var speechPracticeHistory: [SpeechPracticeResult] = []
    var conversationSessions: [ConversationSummary] = []
    var mimicrySessions: [MimicrySession] = []
    
    var overallAccuracy: Double {
        guard totalQuestions > 0 else { return 0.0 }
        return Double(totalCorrectAnswers) / Double(totalQuestions)
    }
    
    mutating func recordGameSession(_ session: GameSession) {
        totalScore += session.score
        totalSessions += 1
        totalCorrectAnswers += session.correctAnswers
        totalQuestions += session.questionsAnswered
        bestStreak = max(bestStreak, session.maxStreak)
        sessions.append(session)
        
        let newLevel = min(5, (totalScore / 1000) + 1)
        if newLevel > currentLevel {
            currentLevel = newLevel
            unlockNewEmotions()
        }
    }
    
    mutating func recordSpeechPractice(_ result: SpeechPracticeResult) {
        speechPracticeHistory.append(result)
        speechPracticeHistory = Array(speechPracticeHistory.suffix(20))
    }
    
    mutating func recordConversation(_ summary: ConversationSummary) {
        conversationSessions.append(summary)
        conversationSessions = Array(conversationSessions.suffix(20))
    }
    
    mutating func recordMimicry(_ session: MimicrySession) {
        mimicrySessions.append(session)
        mimicrySessions = Array(mimicrySessions.suffix(20))
    }
    
    private mutating func unlockNewEmotions() {
        switch currentLevel {
        case 2:
            unlockedEmotions.insert("Surprised")
        case 3:
            unlockedEmotions.insert("Angry")
        case 4:
            unlockedEmotions.insert("Fear")
        default:
            break
        }
    }
}

// MARK: - Curriculum System

class CurriculumManager: ObservableObject {
    @Published var currentQuestion: GameQuestion?
    @Published var questionQueue: [GameQuestion] = []
    @Published var progress: PlayerProgress = PlayerProgress()
    
    private let imageDatasetManager = ImageDatasetManager()
    private weak var authManager: AuthenticationManager?
    
    init(authManager: AuthenticationManager? = nil) {
        self.authManager = authManager
        loadProgress()
        generateQuestionQueue()
    }
    
    func generateQuestionQueue() {
        questionQueue.removeAll()
        
        let unlockedEmotions = Array(progress.unlockedEmotions)
        let questionsPerEmotion = 3
        
        for emotion in unlockedEmotions {
            let emotionQuestions = imageDatasetManager.loadImagesForEmotion(emotion)
            let selectedQuestions = Array(emotionQuestions.prefix(questionsPerEmotion))
            questionQueue.append(contentsOf: selectedQuestions)
        }
        
        questionQueue.shuffle()
    }
    
    func nextQuestion() -> GameQuestion? {
        guard !questionQueue.isEmpty else {
            generateQuestionQueue()
            return questionQueue.first
        }
        
        currentQuestion = questionQueue.removeFirst()
        return currentQuestion
    }
    
    func recordAnswer(isCorrect: Bool, responseTime: TimeInterval) {
        // This will be called by the game view
    }
    
    func completeSession(_ session: GameSession) {
        if let authManager {
            authManager.recordGameSession(session)
            progress = authManager.currentProgress
        } else {
            progress.recordGameSession(session)
            saveProgress()
        }
    }

    private func loadProgress() {
        if let authManager {
            progress = authManager.currentProgress
        } else if let data = UserDefaults.standard.data(forKey: "playerProgress"),
                  let decoded = try? JSONDecoder().decode(PlayerProgress.self, from: data) {
            progress = decoded
        }
    }

    private func saveProgress() {
        if authManager == nil {
            if let encoded = try? JSONEncoder().encode(progress) {
                UserDefaults.standard.set(encoded, forKey: "playerProgress")
            }
        }
    }
}

// MARK: - Practice Result Models

struct SpeechPracticeResult: Identifiable, Codable {
    var id = UUID()
    let date: Date
    let totalPrompts: Int
    let correctResponses: Int
    let score: Int
    
    var accuracy: Double {
        guard totalPrompts > 0 else { return 0 }
        return Double(correctResponses) / Double(totalPrompts)
    }
}

struct ConversationSummary: Identifiable, Codable {
    var id = UUID()
    let date: Date
    let scenarioTitle: String
    let duration: TimeInterval
    let highlights: String
    let recommendations: String
}

struct MimicrySession: Identifiable, Codable {
    var id = UUID()
    let date: Date
    let roundsCompleted: Int
    let averageConfidence: Double
    let score: Int
}
