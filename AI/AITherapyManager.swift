import Foundation
import AVFoundation

// MARK: - AI-Powered Therapy Manager
// This will be enhanced with FoundationModels when using Xcode beta

@available(iOS 18.0, *)
class AITherapyManager: ObservableObject {
    @Published var currentResponse: String = ""
    @Published var isGeneratingResponse = false
    
    private let synthesizer = AVSpeechSynthesizer()
    
    // For now, using enhanced rule-based responses
    // TODO: Replace with FoundationModels LLM when available
    
    func generateTherapeuticResponse(
        emotion: String,
        confidence: Double,
        userProgress: PlayerProgress,
        context: TherapyContext
    ) async -> String {
        
        isGeneratingResponse = true
        defer { isGeneratingResponse = false }
        
        // Enhanced therapeutic responses based on context
        let response = buildContextualResponse(
            emotion: emotion,
            confidence: confidence,
            progress: userProgress,
            context: context
        )
        
        await MainActor.run {
            currentResponse = response
        }
        
        return response
    }
    
    private func buildContextualResponse(
        emotion: String,
        confidence: Double,
        progress: PlayerProgress,
        context: TherapyContext
    ) -> String {
        
        let emotionLower = emotion.lowercased()
        let userLevel = progress.currentLevel
        let accuracy = progress.overallAccuracy
        
        // Personalized based on user's progress and context
        var response = ""
        
        switch context {
        case .gameMode:
            response = buildGameModeResponse(emotionLower, confidence, userLevel, accuracy)
        case .mimicryMode:
            response = buildMimicryModeResponse(emotionLower, confidence, userLevel)
        case .progressReview:
            response = buildProgressResponse(progress)
        }
        
        return response
    }
    
    private func buildGameModeResponse(
        _ emotion: String,
        _ confidence: Double,
        _ level: Int,
        _ accuracy: Double
    ) -> String {
        
        let isHighConfidence = confidence > 0.8
        let isGoodAccuracy = accuracy > 0.7
        
        switch emotion {
        case "happy":
            if isHighConfidence && isGoodAccuracy {
                return "Excellent! You're getting really good at recognizing happiness. That bright smile shows you understand joy!"
            } else if level == 1 {
                return "Great job identifying happiness! See how the corners of the mouth turn up and the eyes crinkle? That's joy!"
            } else {
                return "Well done! You're mastering the art of reading happy expressions. Keep building on this skill!"
            }
            
        case "sad":
            if isHighConfidence {
                return "Good recognition of sadness. It's important to understand when someone might need support and kindness."
            } else if level == 1 {
                return "You identified sadness correctly. Notice how the mouth turns down and the eyes look heavy? That's how sadness appears."
            } else {
                return "Nice work with sadness recognition. Understanding difficult emotions helps us be more caring toward others."
            }
            
        case "angry":
            if isHighConfidence {
                return "Excellent anger recognition! Knowing when someone is upset helps us respond with patience and understanding."
            } else {
                return "Good job spotting anger. See the tense eyebrows and tight lips? Recognizing anger helps us stay calm and kind."
            }
            
        case "surprised":
            if isHighConfidence {
                return "Perfect! You caught that surprise expression. Wide eyes and an open mouth are classic signs of being amazed!"
            } else {
                return "Great work identifying surprise! Those wide eyes and raised eyebrows show someone is amazed or startled."
            }
            
        case "fear":
            if isHighConfidence {
                return "Well done recognizing fear. Understanding when someone is scared helps us offer comfort and support."
            } else {
                return "Good job with fear recognition. Wide eyes and tense features show someone needs reassurance."
            }
            
        case "neutral":
            if isHighConfidence {
                return "Excellent! You recognized a neutral expression. Sometimes people are just relaxed and content."
            } else {
                return "Good work identifying neutral. Not every expression shows strong emotion - sometimes people are just calm."
            }
            
        default:
            return "Keep practicing! Each emotion you learn to recognize helps you understand others better."
        }
    }
    
    private func buildMimicryModeResponse(
        _ emotion: String,
        _ confidence: Double,
        _ level: Int
    ) -> String {
        
        let isHighConfidence = confidence > 0.7
        
        switch emotion {
        case "happy":
            if isHighConfidence {
                return "Perfect happy expression! Your smile is bright and genuine. You're showing real joy!"
            } else {
                return "Good try with happiness! Let your smile reach your eyes. Think of something that makes you feel joyful!"
            }
            
        case "sad":
            if isHighConfidence {
                return "You've captured sadness well. Sometimes practicing difficult emotions helps us understand them better."
            } else {
                return "Good effort with sadness. Let your face relax and think of something that makes you feel a bit down."
            }
            
        case "angry":
            if isHighConfidence {
                return "You've shown anger clearly! Understanding how anger looks helps us recognize it in ourselves and others."
            } else {
                return "Good try with anger. Tense your eyebrows and tighten your lips - but remember, this is just practice!"
            }
            
        case "surprised":
            if isHighConfidence {
                return "Amazing surprise expression! Your eyes are wide and your mouth shows real amazement!"
            } else {
                return "Good work on surprise! Open your eyes wide and let your mouth drop open like you've seen something incredible!"
            }
            
        case "fear":
            if isHighConfidence {
                return "You've shown fear very clearly. Practicing this helps us understand when someone needs comfort."
            } else {
                return "Good effort with fear. Widen your eyes and tense your features - but remember, you're safe here!"
            }
            
        case "neutral":
            if isHighConfidence {
                return "Perfect neutral expression! Sometimes the most natural expression is simply being relaxed and calm."
            } else {
                return "Good work on neutral. Just relax your face and breathe naturally. No need to show strong emotion."
            }
            
        default:
            return "Keep practicing! Each expression you master helps you communicate better with others."
        }
    }
    
    private func buildProgressResponse(_ progress: PlayerProgress) -> String {
        let accuracy = progress.overallAccuracy
        let level = progress.currentLevel
        let sessions = progress.totalSessions
        
        if accuracy > 0.9 {
            return "Outstanding progress! You're achieving over 90% accuracy. You're becoming an expert at reading emotions!"
        } else if accuracy > 0.7 {
            return "Great progress! You're getting better at recognizing emotions. Keep practicing and you'll master this skill!"
        } else if sessions < 3 {
            return "Welcome to your emotional learning journey! Every session helps you understand feelings better."
        } else {
            return "You're learning and growing! Each practice session builds your emotional intelligence. Keep going!"
        }
    }
    
    func speakResponse(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.5
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        
        synthesizer.speak(utterance)
    }
}

// MARK: - Supporting Types

enum TherapyContext {
    case gameMode
    case mimicryMode
    case progressReview
}

// MARK: - Fallback for iOS < 18.0

class LegacyAudioManager: ObservableObject {
    private let synthesizer = AVSpeechSynthesizer()
    
    func playFeedback(isCorrect: Bool, emotion: String) {
        var message = ""
        
        if isCorrect {
            message = "Correct! That's \(emotion)!"
        } else {
            message = "Good try! Let's keep practicing."
        }
        
        let utterance = AVSpeechUtterance(string: message)
        utterance.rate = 0.5
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        
        synthesizer.speak(utterance)
    }
}

// MARK: - Future FoundationModels Integration
// When using Xcode beta, replace the rule-based responses with:

/*
import FoundationModels

@available(iOS 18.0, *)
extension AITherapyManager {
    
    func generateLLMResponse(
        emotion: String,
        confidence: Double,
        userProgress: PlayerProgress,
        context: TherapyContext
    ) async -> String {
        
        // This will be implemented with FoundationModels when available
        let prompt = buildTherapeuticPrompt(
            emotion: emotion,
            confidence: confidence,
            progress: userProgress,
            context: context
        )
        
        // TODO: Replace with actual LLM inference
        // let response = await llmModel.generate(prompt: prompt)
        
        return buildContextualResponse(
            emotion: emotion,
            confidence: confidence,
            progress: userProgress,
            context: context
        )
    }
    
    private func buildTherapeuticPrompt(
        emotion: String,
        confidence: Double,
        progress: PlayerProgress,
        context: TherapyContext
    ) -> String {
        
        return """
        You are AURA, a therapeutic AI assistant helping individuals with autism learn to recognize and understand emotions.
        
        Current situation:
        - User detected emotion: \(emotion)
        - Confidence: \(confidence)
        - User level: \(progress.currentLevel)
        - Overall accuracy: \(progress.overallAccuracy)
        - Context: \(context)
        
        Provide a supportive, encouraging response that:
        1. Acknowledges their progress
        2. Explains the emotion if needed
        3. Offers practical insights
        4. Maintains a positive, therapeutic tone
        5. Keeps response under 50 words
        
        Focus on building confidence and emotional intelligence.
        """
    }
}
*/