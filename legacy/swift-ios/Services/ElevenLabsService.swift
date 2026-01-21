import Foundation
import AVFoundation

// MARK: - ElevenLabs Voice Service
class ElevenLabsService: ObservableObject {
    static let shared = ElevenLabsService()
    
    private let apiKeyManager = APIKeyManager.shared
    
    private var apiKey: String {
        return apiKeyManager.getElevenLabsAPIKey()
    }
    
    private let baseURL = "https://api.elevenlabs.io/v1"
    
    // MARK: - Voice Configuration
    struct VoiceConfig {
        static let childFriendly = "21m00Tcm4TlvDq8ikWAM" // Rachel - warm, clear voice
        static let therapeutic = "ErXwobaYiN019PkySvjV" // Antoni - calm, professional
        static let encouraging = "MF3mGyEYCl7XYWbV9V6O" // Elli - upbeat, positive
    }
    
    // MARK: - Text-to-Speech
    func synthesizeSpeech(_ text: String, voice: String = VoiceConfig.childFriendly, speed: Double = 1.0) async throws -> Data {
        let url = URL(string: "\(baseURL)/text-to-speech/\(voice)")!
        
        let requestBody: [String: Any] = [
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": [
                "stability": 0.75,
                "similarity_boost": 0.8,
                "style": 0.5,
                "use_speaker_boost": true
            ]
        ]
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw ElevenLabsError.apiError("Failed to synthesize speech")
        }
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .elevenLabs, requests: 1)
        
        return data
    }
    
    // MARK: - Real-time Conversation Audio
    func synthesizeConversationResponse(_ text: String, emotionalTone: EmotionalTone) async throws -> Data {
        let voice = selectVoiceForTone(emotionalTone)
        return try await synthesizeSpeech(text, voice: voice)
    }
    
    // MARK: - Therapeutic Feedback Audio
    func synthesizeTherapeuticFeedback(_ feedback: TherapeuticFeedback) async throws -> Data {
        let voice = VoiceConfig.therapeutic
        let text = generateFeedbackText(feedback)
        return try await synthesizeSpeech(text, voice: voice, speed: 0.9) // Slightly slower for clarity
    }
    
    // MARK: - Encouragement Audio
    func synthesizeEncouragement(_ encouragementType: EncouragementType) async throws -> Data {
        let voice = VoiceConfig.encouraging
        let text = generateEncouragementText(encouragementType)
        return try await synthesizeSpeech(text, voice: voice, speed: 1.1) // Slightly faster for energy
    }
    
    // MARK: - Voice Cloning (Future Feature)
    func cloneVoice(from audioSamples: [Data], name: String) async throws -> String {
        // TODO: Implement voice cloning for "safe person" voices
        // This would allow parents/teachers to create custom voices
        throw ElevenLabsError.notImplemented
    }
    
    // MARK: - Helper Methods
    private func selectVoiceForTone(_ tone: EmotionalTone) -> String {
        switch tone {
        case .supportive, .neutral:
            return VoiceConfig.childFriendly
        case .encouraging:
            return VoiceConfig.encouraging
        case .corrective:
            return VoiceConfig.therapeutic
        }
    }
    
    private func generateFeedbackText(_ feedback: TherapeuticFeedback) -> String {
        switch feedback.type {
        case .correct:
            return "Great job! You identified \(feedback.emotion) correctly. That was excellent work!"
        case .incorrect:
            return "That's okay! The correct emotion was \(feedback.correctEmotion). Let's try another one!"
        case .encouragement:
            return "You're doing wonderful! Keep practicing and you'll get even better at recognizing emotions."
        case .timeUp:
            return "Time's up! Don't worry, recognizing emotions takes practice. Let's try the next one!"
        }
    }
    
    private func generateEncouragementText(_ type: EncouragementType) -> String {
        switch type {
        case .sessionStart:
            return "Welcome! Let's practice recognizing emotions together. You're going to do great!"
        case .milestone:
            return "Amazing! You've reached a new milestone. I'm so proud of your progress!"
        case .streakAchieved:
            return "Fantastic! You got several in a row correct. You're really getting good at this!"
        case .sessionComplete:
            return "Wonderful job today! You worked really hard and improved so much. See you next time!"
        }
    }
}

// MARK: - Audio Player Integration
extension ElevenLabsService {
    func playAudio(_ audioData: Data) async throws {
        try await withCheckedThrowingContinuation { continuation in
            do {
                let audioPlayer = try AVAudioPlayer(data: audioData)
                audioPlayer.play()
                
                // Wait for audio to finish
                DispatchQueue.main.asyncAfter(deadline: .now() + audioPlayer.duration) {
                    continuation.resume()
                }
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    func playConversationResponse(_ text: String, tone: EmotionalTone) async throws {
        let audioData = try await synthesizeConversationResponse(text, emotionalTone: tone)
        try await playAudio(audioData)
    }
    
    func playFeedback(_ feedback: TherapeuticFeedback) async throws {
        let audioData = try await synthesizeTherapeuticFeedback(feedback)
        try await playAudio(audioData)
    }
    
    func playEncouragement(_ type: EncouragementType) async throws {
        let audioData = try await synthesizeEncouragement(type)
        try await playAudio(audioData)
    }
}

// MARK: - Data Models
enum ElevenLabsError: Error {
    case apiError(String)
    case notImplemented
    case audioPlaybackError
}

struct TherapeuticFeedback {
    let type: FeedbackType
    let emotion: String
    let correctEmotion: String
    let isCorrect: Bool
}

enum FeedbackType {
    case correct
    case incorrect
    case encouragement
    case timeUp
}

enum EncouragementType {
    case sessionStart
    case milestone
    case streakAchieved
    case sessionComplete
}

// MARK: - Voice Quality Configuration
extension ElevenLabsService {
    struct VoiceSettings {
        static let clarity = VoiceSettingsConfig(stability: 0.8, similarityBoost: 0.9, style: 0.3)
        static let warmth = VoiceSettingsConfig(stability: 0.7, similarityBoost: 0.8, style: 0.6)
        static let energy = VoiceSettingsConfig(stability: 0.6, similarityBoost: 0.7, style: 0.8)
    }
    
    struct VoiceSettingsConfig {
        let stability: Double
        let similarityBoost: Double
        let style: Double
    }
}