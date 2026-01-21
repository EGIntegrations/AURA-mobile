import Foundation

// MARK: - Dynamic Curriculum Engine
class CurriculumEngine: ObservableObject {
    static let shared = CurriculumEngine()
    
    @Published var currentCurriculum: CurriculumPlan?
    @Published var userProgress: UserProgress = UserProgress()
    
    private let openAIService = OpenAIService.shared
    
    // MARK: - Curriculum Generation Based on Performance
    func generateAdaptiveCurriculum(for user: User) async throws -> CurriculumPlan {
        let performance = calculateUserPerformance(user)
        let level = determineUserLevel(user)
        
        let curriculum = try await openAIService.generateCurriculum(for: level, performance: performance)
        
        self.currentCurriculum = curriculum
        return curriculum
    }
    
    // MARK: - Real-time Adaptation During Gameplay
    func adaptCurriculumRealTime(based gameSession: GameSession, userEmotionalState: EmotionalState) -> CurriculumAdjustment {
        var adaptation = CurriculumAdjustment()
        
        // Analyze current performance
        if gameSession.accuracy < 0.6 {
            adaptation.suggestEasierEmotions()
            adaptation.extendTimeLimit()
        } else if gameSession.accuracy > 0.85 {
            adaptation.introduceComplexEmotions()
            adaptation.reduceTimeLimit()
        }
        
        // Adjust based on user's emotional state during gameplay
        switch userEmotionalState.primary {
        case .frustrated:
            adaptation.addBreakTime()
            adaptation.introduceCalming()
        case .confident:
            adaptation.increaseDifficulty()
        case .confused:
            adaptation.provideClearer()
            adaptation.addHints()
        default:
            break
        }
        
        return adaptation
    }
    
    // MARK: - Modular Progression System
    func checkEmotionMastery(emotion: String, for user: User) -> MasteryLevel {
        let emotionStats = getEmotionStatistics(emotion: emotion, user: user)
        
        if emotionStats.accuracy >= 0.9 && emotionStats.consistentPerformance {
            return .mastered
        } else if emotionStats.accuracy >= 0.7 && emotionStats.improvingTrend {
            return .proficient
        } else if emotionStats.accuracy >= 0.5 {
            return .learning
        } else {
            return .struggling
        }
    }
    
    func unlockNextEmotionSet(for user: User) -> [String] {
        let masteredEmotions = getMasteredEmotions(user)
        
        // Progression path: Basic → Complex → Subtle
        let basicEmotions = ["happy", "sad", "angry"]
        let complexEmotions = ["surprised", "fear", "disgusted"]
        let subtleEmotions = ["confused", "excited", "disappointed", "proud"]
        
        if masteredEmotions.count >= basicEmotions.count {
            if masteredEmotions.contains(allOf: basicEmotions) {
                return complexEmotions.filter { !masteredEmotions.contains($0) }
            }
        }
        
        if masteredEmotions.count >= (basicEmotions.count + complexEmotions.count) {
            return subtleEmotions.filter { !masteredEmotions.contains($0) }
        }
        
        return basicEmotions.filter { !masteredEmotions.contains($0) }
    }
    
    // MARK: - Performance Analysis
    private func calculateUserPerformance(_ user: User) -> UserPerformance {
        let recentSessions = user.progress.sessions.suffix(10) // Last 10 sessions

        let totalAccuracy = recentSessions.map { $0.accuracy }.reduce(0, +) / Double(recentSessions.count)
        let avgResponseTime = recentSessions.map { $0.averageResponseTime }.reduce(0, +) / Double(recentSessions.count)

        let strugglingEmotions: [String] = [] // Simplified - questions not tracked in sessions
        let excellingEmotions: [String] = [] // Simplified - questions not tracked in sessions

        return UserPerformance(
            accuracyPercentage: totalAccuracy * 100,
            averageResponseTime: avgResponseTime,
            strugglingEmotions: strugglingEmotions,
            excellingEmotions: excellingEmotions
        )
    }

    private func determineUserLevel(_ user: User) -> UserLevel {
        let overallAccuracy = user.progress.overallAccuracy
        let sessionsCompleted = user.progress.sessions.count
        
        if overallAccuracy >= 0.8 && sessionsCompleted >= 20 {
            return UserLevel(level: 3, description: "Advanced - Ready for complex emotions and scenarios")
        } else if overallAccuracy >= 0.6 && sessionsCompleted >= 10 {
            return UserLevel(level: 2, description: "Intermediate - Building confidence with basic emotions")
        } else {
            return UserLevel(level: 1, description: "Beginner - Learning fundamental emotions")
        }
    }
    
    // Simplified - questions not tracked in GameSession anymore
    // These methods would need to be reimplemented with a different tracking approach

    private func getEmotionStatistics(emotion: String, user: User) -> EmotionStatistics {
        // Simplified - would need different approach without question tracking in sessions
        let accuracy = user.progress.overallAccuracy // Use overall accuracy as approximation

        return EmotionStatistics(
            emotion: emotion,
            accuracy: accuracy,
            improvingTrend: false,
            consistentPerformance: false
        )
    }
    
    private func getMasteredEmotions(_ user: User) -> [String] {
        let allEmotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        return allEmotions.filter { checkEmotionMastery(emotion: $0, for: user) == .mastered }
    }
}

// MARK: - Data Models
struct CurriculumAdjustment {
    var difficultyChange: DifficultyChange = .maintain
    var timeLimitAdjustment: TimeAdjustment = .maintain
    var emotionFocus: [String] = []
    var specialInterventions: [Intervention] = []
    
    mutating func suggestEasierEmotions() {
        difficultyChange = .decrease
        emotionFocus = ["happy", "sad"] // Focus on clearest emotions
    }
    
    mutating func introduceComplexEmotions() {
        difficultyChange = .increase
        emotionFocus = ["surprised", "fear", "disgusted"]
    }
    
    mutating func extendTimeLimit() {
        timeLimitAdjustment = .increase(seconds: 10)
    }
    
    mutating func reduceTimeLimit() {
        timeLimitAdjustment = .decrease(seconds: 5)
    }
    
    mutating func addBreakTime() {
        specialInterventions.append(.breakTime(duration: 30))
    }
    
    mutating func introduceCalming() {
        specialInterventions.append(.calmingExercise)
    }
    
    mutating func increaseDifficulty() {
        difficultyChange = .increase
    }
    
    mutating func provideClearer() {
        specialInterventions.append(.clearerInstructions)
    }
    
    mutating func addHints() {
        specialInterventions.append(.visualHints)
    }
}

enum DifficultyChange {
    case increase
    case decrease
    case maintain
}

enum TimeAdjustment {
    case increase(seconds: Int)
    case decrease(seconds: Int)
    case maintain
}

enum Intervention {
    case breakTime(duration: TimeInterval)
    case calmingExercise
    case clearerInstructions
    case visualHints
    case encouragement
}

enum MasteryLevel {
    case struggling
    case learning
    case proficient
    case mastered
}

struct EmotionStatistics {
    let emotion: String
    let accuracy: Double
    let improvingTrend: Bool
    let consistentPerformance: Bool
}

struct UserProgress {
    var currentLevel: Int = 1
    var totalSessions: Int = 0
    var overallAccuracy: Double = 0.0
    var masteredEmotions: [String] = []
    var currentStreak: Int = 0
    var longestStreak: Int = 0
}

struct EmotionalState: Equatable {
    let primary: Emotion
    let intensity: Double // 0.0 to 1.0
    let confidence: Double // How confident we are in this reading
    
    enum Emotion: Equatable {
        case happy, sad, angry, surprised, fear, neutral, frustrated, confident, confused
    }
}

// MARK: - Extensions
extension Array where Element == String {
    func contains(allOf elements: [String]) -> Bool {
        return elements.allSatisfy(self.contains)
    }
}