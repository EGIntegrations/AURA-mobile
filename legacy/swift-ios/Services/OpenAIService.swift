import Foundation
import UIKit

// MARK: - OpenAI Service Configuration
class OpenAIService: ObservableObject {
    static let shared = OpenAIService()
    
    // MARK: - Model Configuration (Easy to Update)
    struct Models {
        static let curriculum = "gpt-5-nano-2025-08-07"
        static let imageGeneration = "gpt-image-1"
        static let speechToText = "gpt-4o-mini-transcribe"
        static let vision = "gpt-4o-mini-2024-07-18"
        static let textToSpeech = "gpt-4o-mini-tts"
    }
    
    // MARK: - API Configuration (Modular Keys)
    private let apiKeyManager = APIKeyManager.shared
    
    private func getAPIKey(for service: APIService) -> String {
        return apiKeyManager.getAPIKey(for: service, fallback: "")
    }
    
    private let baseURL = "https://api.openai.com/v1"
    
    // MARK: - Curriculum Generation
    func generateCurriculum(for userLevel: UserLevel, performance: UserPerformance) async throws -> CurriculumPlan {
        let prompt = """
        Create a personalized autism therapy curriculum for a user with the following profile:
        - Current Level: \(userLevel.description)
        - Recent Performance: \(performance.accuracyPercentage)% accuracy, \(performance.averageResponseTime)s avg response time
        - Struggles with: \(performance.strugglingEmotions.joined(separator: ", "))
        - Excels at: \(performance.excellingEmotions.joined(separator: ", "))
        
        Generate a progressive curriculum focusing on emotion recognition with specific exercises.
        Return as structured JSON with difficulty progression and specific emotion targets.
        """
        
        let response = try await makeChatRequest(
            model: Models.curriculum, 
            prompt: prompt, 
            apiKey: getAPIKey(for: .chatbot)
        )
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .chatbot, requests: 1)
        
        return try parseCurriculumResponse(response)
    }
    
    // MARK: - Image Generation for Emotions
    func generateEmotionImage(emotion: String, style: ImageStyle = .photorealistic) async throws -> Data {
        let prompt = generateImagePrompt(for: emotion, style: style)
        
        let request = ImageGenerationRequest(
            model: Models.imageGeneration,
            prompt: prompt,
            size: "1024x1024",
            quality: "standard",
            n: 1
        )
        
        let result = try await makeImageRequest(request, apiKey: getAPIKey(for: .imageGeneration))
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .imageGeneration, requests: 1)
        
        return result
    }
    
    // MARK: - Safe Person Image Generation (Premium Feature)
    func generateSafePersonEmotions(baseFaceData: Data, emotions: [String]) async throws -> [String: Data] {
        var results: [String: Data] = [:]
        
        for emotion in emotions {
            let imageData = try await generateEmotionImage(emotion: emotion, style: .photorealistic)
            results[emotion] = imageData
        }
        
        return results
    }
    
    // MARK: - Vision API for Emotion Recognition
    func recognizeEmotion(in imageData: Data) async throws -> EmotionRecognitionResult {
        let base64Image = imageData.base64EncodedString()
        
        let request = VisionRequest(
            model: Models.vision,
            messages: [
                VisionMessage(
                    role: "user",
                    content: [
                        VisionContent(type: "text", text: "Analyze this facial expression and identify the primary emotion. Return ONLY the emotion name from: happy, sad, angry, surprised, fear, neutral. Also provide a confidence score 0-100.", imageUrl: nil),
                        VisionContent(type: "image_url", text: nil, imageUrl: VisionImageURL(url: "data:image/jpeg;base64,\(base64Image)"))
                    ]
                )
            ],
            max_tokens: 50
        )
        
        let response = try await makeVisionRequest(request, apiKey: getAPIKey(for: .vision))
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .vision, requests: 1)
        
        return try parseEmotionResponse(response)
    }
    
    // MARK: - Real-time Conversation
    func generateConversationResponse(userInput: String, context: ConversationContext) async throws -> ConversationResponse {
        let systemPrompt = """
        You are a friendly therapy assistant helping a child with autism practice social conversations.
        
        Context:
        - User's current emotional state: \(context.userEmotionalState)
        - Conversation topic: \(context.topic)
        - User's communication level: \(context.userLevel)
        
        Guidelines:
        - Use simple, clear language appropriate for the user's level
        - Be patient and encouraging
        - Ask follow-up questions to practice conversation skills
        - Help the user understand social cues and appropriate responses
        """
        
        let response = try await makeChatRequest(
            model: Models.curriculum,
            prompt: userInput,
            systemPrompt: systemPrompt,
            apiKey: getAPIKey(for: .chatbot)
        )
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .chatbot, requests: 1)
        
        return ConversationResponse(
            text: response,
            suggestedResponses: [], // TODO: Generate suggested responses
            emotionalTone: .supportive
        )
    }
    
    // MARK: - Speech-to-Text
    func transcribeAudio(_ audioData: Data) async throws -> String {
        let request = TranscriptionRequest(
            model: Models.speechToText,
            file: audioData,
            response_format: "text"
        )
        
        let result = try await makeTranscriptionRequest(request, apiKey: getAPIKey(for: .speechToText))
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .speechToText, requests: 1)
        
        return result
    }
    
    // MARK: - Text-to-Speech (Backup to ElevenLabs)
    func synthesizeSpeech(_ text: String, voice: VoiceType = .alloy) async throws -> Data {
        let request = TTSRequest(
            model: Models.textToSpeech,
            input: text,
            voice: voice.rawValue,
            response_format: "mp3"
        )
        
        let result = try await makeTTSRequest(request, apiKey: getAPIKey(for: .textToSpeech))
        
        // Log usage for cost tracking
        apiKeyManager.logAPIUsage(service: .textToSpeech, requests: 1)
        
        return result
    }
    
    // MARK: - Private API Methods
    private func makeChatRequest(model: String, prompt: String, systemPrompt: String? = nil, apiKey: String) async throws -> String {
        var messages: [[String: String]] = []
        
        if let systemPrompt = systemPrompt {
            messages.append(["role": "system", "content": systemPrompt])
        }
        messages.append(["role": "user", "content": prompt])
        
        let requestBody: [String: Any] = [
            "model": model,
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        ]
        
        return try await makeAPIRequest(endpoint: "/chat/completions", body: requestBody, responseKey: "choices.0.message.content", apiKey: apiKey)
    }
    
    private func makeImageRequest(_ request: ImageGenerationRequest, apiKey: String) async throws -> Data {
        let requestBody = try JSONEncoder().encode(request)
        let response = try await makeRawAPIRequest(endpoint: "/images/generations", body: requestBody, apiKey: apiKey)
        
        // Extract image URL from response and download
        if let json = try JSONSerialization.jsonObject(with: response) as? [String: Any],
           let data = json["data"] as? [[String: Any]],
           let firstImage = data.first,
           let urlString = firstImage["url"] as? String,
           let url = URL(string: urlString) {
            
            let (imageData, _) = try await URLSession.shared.data(from: url)
            return imageData
        }
        
        throw OpenAIError.invalidResponse
    }
    
    private func makeVisionRequest(_ request: VisionRequest, apiKey: String) async throws -> String {
        let requestBody = try JSONEncoder().encode(request)
        let response = try await makeRawAPIRequest(endpoint: "/chat/completions", body: requestBody, apiKey: apiKey)
        
        if let json = try JSONSerialization.jsonObject(with: response) as? [String: Any],
           let choices = json["choices"] as? [[String: Any]],
           let firstChoice = choices.first,
           let message = firstChoice["message"] as? [String: Any],
           let content = message["content"] as? String {
            return content
        }
        
        throw OpenAIError.invalidResponse
    }
    
    private func makeTranscriptionRequest(_ request: TranscriptionRequest, apiKey: String) async throws -> String {
        // TODO: Implement multipart/form-data request for audio file
        throw OpenAIError.notImplemented
    }
    
    private func makeTTSRequest(_ request: TTSRequest, apiKey: String) async throws -> Data {
        let requestBody = try JSONEncoder().encode(request)
        return try await makeRawAPIRequest(endpoint: "/audio/speech", body: requestBody, apiKey: apiKey)
    }
    
    private func makeAPIRequest(endpoint: String, body: [String: Any], responseKey: String, apiKey: String) async throws -> String {
        let jsonData = try JSONSerialization.data(withJSONObject: body)
        let response = try await makeRawAPIRequest(endpoint: endpoint, body: jsonData, apiKey: apiKey)
        
        // Parse response using key path
        if let json = try JSONSerialization.jsonObject(with: response) as? [String: Any] {
            let keyPath = responseKey.split(separator: ".").map(String.init)
            var current: Any = json
            
            for key in keyPath {
                if let dict = current as? [String: Any] {
                    current = dict[key] ?? ""
                } else if let array = current as? [Any], let index = Int(key) {
                    current = array[index]
                } else {
                    throw OpenAIError.invalidResponse
                }
            }
            
            return current as? String ?? ""
        }
        
        throw OpenAIError.invalidResponse
    }
    
    private func makeRawAPIRequest(endpoint: String, body: Data, apiKey: String) async throws -> Data {
        guard let url = URL(string: baseURL + endpoint) else {
            throw OpenAIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw OpenAIError.apiError(String(data: data, encoding: .utf8) ?? "Unknown error")
        }
        
        return data
    }
    
    // MARK: - Helper Methods
    private func generateImagePrompt(for emotion: String, style: ImageStyle) -> String {
        let basePrompt = "A photorealistic close-up portrait of a person clearly displaying a \(emotion) emotion"
        
        switch style {
        case .photorealistic:
            return "\(basePrompt). High quality, professional photography, clear facial expression, good lighting, neutral background."
        case .illustrated:
            return "\(basePrompt). Digital illustration style, clean and clear emotional expression."
        case .safePerson:
            return "\(basePrompt). Warm, approachable appearance suitable for autism therapy, clear \(emotion) expression."
        }
    }
    
    private func parseCurriculumResponse(_ response: String) throws -> CurriculumPlan {
        // TODO: Parse JSON response into CurriculumPlan object
        return CurriculumPlan(exercises: [], targetEmotions: [], difficultyLevel: 1)
    }
    
    private func parseEmotionResponse(_ response: String) throws -> EmotionRecognitionResult {
        // Parse the emotion and confidence from the response
        let lines = response.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: .newlines)
        let emotionLine = lines.first?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        
        // Extract emotion (should be one of: happy, sad, angry, surprised, fear, neutral)
        let validEmotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        let detectedEmotion = validEmotions.first { emotionLine.lowercased().contains($0) } ?? "neutral"
        
        // Extract confidence (look for numbers 0-100)
        let confidence = extractConfidence(from: response)
        
        return EmotionRecognitionResult(
            emotion: detectedEmotion,
            confidence: confidence,
            rawResponse: response
        )
    }
    
    private func extractConfidence(from text: String) -> Double {
        let pattern = #"\b(\d{1,3})\b"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range, in: text) {
            if let confidence = Double(String(text[range])), confidence <= 100 {
                return confidence / 100.0
            }
        }
        return 0.5 // Default confidence
    }
}

// MARK: - Data Models
enum OpenAIError: Error {
    case invalidURL
    case invalidResponse
    case apiError(String)
    case notImplemented
}

enum ImageStyle {
    case photorealistic
    case illustrated
    case safePerson
}

enum VoiceType: String {
    case alloy
    case echo
    case fable
    case onyx
    case nova
    case shimmer
}

// MARK: - Request Models
struct ImageGenerationRequest: Codable {
    let model: String
    let prompt: String
    let size: String
    let quality: String
    let n: Int
}

struct VisionRequest: Codable {
    let model: String
    let messages: [VisionMessage]
    let max_tokens: Int
}

struct VisionMessage: Codable {
    let role: String
    let content: [VisionContent]
}

struct VisionContent: Codable {
    let type: String
    let text: String?
    let imageUrl: VisionImageURL?
    
    enum CodingKeys: String, CodingKey {
        case type, text
        case imageUrl = "image_url"
    }
}

struct VisionImageURL: Codable {
    let url: String
}

struct TranscriptionRequest: Codable {
    let model: String
    let file: Data
    let response_format: String
}

struct TTSRequest: Codable {
    let model: String
    let input: String
    let voice: String
    let response_format: String
}

// MARK: - Response Models
struct EmotionRecognitionResult {
    let emotion: String
    let confidence: Double
    let rawResponse: String
}

struct ConversationResponse {
    let text: String
    let suggestedResponses: [String]
    let emotionalTone: EmotionalTone
}

enum EmotionalTone {
    case supportive
    case encouraging
    case neutral
    case corrective
}

struct ConversationContext {
    let userEmotionalState: String
    let topic: String
    let userLevel: String
}

struct CurriculumPlan {
    let exercises: [TherapyExercise]
    let targetEmotions: [String]
    let difficultyLevel: Int
}

struct TherapyExercise {
    let id: String
    let type: ExerciseType
    let targetEmotion: String
    let description: String
    let estimatedDuration: TimeInterval
}

enum ExerciseType {
    case emotionRecognition
    case conversationPractice
    case facialMimicry
    case scenarioResponse
}

struct UserLevel {
    let level: Int
    let description: String
}

struct UserPerformance {
    let accuracyPercentage: Double
    let averageResponseTime: Double
    let strugglingEmotions: [String]
    let excellingEmotions: [String]
}
