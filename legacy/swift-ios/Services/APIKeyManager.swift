import Foundation

// MARK: - Centralized API Key Management
class APIKeyManager {
    static let shared = APIKeyManager()
    private init() {}
    
    // MARK: - API Key Configuration
    struct APIKeys {
        // OpenAI Services (Separate keys for better tracking)
        // NOTE: In production, these should be loaded from secure environment variables or keychain
        // For development, you can set these to your actual API keys
        static let chatbot = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "YOUR_OPENAI_CHATBOT_API_KEY_HERE"
        static let imageGeneration = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "YOUR_OPENAI_IMAGE_API_KEY_HERE"
        static let vision = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "YOUR_OPENAI_VISION_API_KEY_HERE"
        static let speechToText = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "YOUR_OPENAI_STT_API_KEY_HERE"
        static let textToSpeech = ProcessInfo.processInfo.environment["OPENAI_API_KEY"] ?? "YOUR_OPENAI_TTS_API_KEY_HERE"
        
        // Voice Services
        static let elevenLabs = ProcessInfo.processInfo.environment["ELEVENLABS_API_KEY"] ?? "YOUR_ELEVENLABS_API_KEY_HERE"
        
        // Future AI Services (Ready for expansion)
        static let anthropic = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? "YOUR_ANTHROPIC_API_KEY_HERE"
        static let replicate = ProcessInfo.processInfo.environment["REPLICATE_API_KEY"] ?? "YOUR_REPLICATE_API_KEY_HERE"
        static let assemblyAI = ProcessInfo.processInfo.environment["ASSEMBLY_AI_API_KEY"] ?? "YOUR_ASSEMBLY_AI_API_KEY_HERE"
    }
    
    // MARK: - Service-Specific API Key Retrieval
    func getChatbotAPIKey() -> String {
        return getAPIKey(for: .chatbot, fallback: APIKeys.chatbot)
    }
    
    func getImageGenerationAPIKey() -> String {
        return getAPIKey(for: .imageGeneration, fallback: APIKeys.imageGeneration)
    }
    
    func getVisionAPIKey() -> String {
        return getAPIKey(for: .vision, fallback: APIKeys.vision)
    }
    
    func getSpeechToTextAPIKey() -> String {
        return getAPIKey(for: .speechToText, fallback: APIKeys.speechToText)
    }
    
    func getTextToSpeechAPIKey() -> String {
        return getAPIKey(for: .textToSpeech, fallback: APIKeys.textToSpeech)
    }
    
    func getElevenLabsAPIKey() -> String {
        return getAPIKey(for: .elevenLabs, fallback: APIKeys.elevenLabs)
    }
    
    // MARK: - Secure Key Storage (Environment Variables & Keychain)
    func getAPIKey(for service: APIService, fallback: String) -> String {
        // 1. Try environment variable first (for development)
        if let envKey = ProcessInfo.processInfo.environment[service.environmentKey], !envKey.isEmpty {
            return envKey
        }
        
        // 2. Try keychain (for production)
        if let keychainKey = KeychainManager.shared.getAPIKey(for: service.keychainKey), !keychainKey.isEmpty {
            return keychainKey
        }
        
        // 3. Fall back to hardcoded (for initial setup)
        return fallback
    }
    
    // MARK: - API Key Validation
    func validateAPIKey(_ key: String, for service: APIService) async -> Bool {
        // Skip validation for placeholder keys
        if key.contains("YOUR_") || key.contains("API_KEY_HERE") {
            return false
        }
        
        switch service {
        case .chatbot, .imageGeneration, .vision, .speechToText, .textToSpeech:
            return await validateOpenAIKey(key)
        case .elevenLabs:
            return await validateElevenLabsKey(key)
        default:
            return key.count > 20 // Basic length check
        }
    }
    
    private func validateOpenAIKey(_ key: String) async -> Bool {
        let url = URL(string: "https://api.openai.com/v1/models")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }
    
    private func validateElevenLabsKey(_ key: String) async -> Bool {
        let url = URL(string: "https://api.elevenlabs.io/v1/voices")!
        var request = URLRequest(url: url)
        request.setValue(key, forHTTPHeaderField: "xi-api-key")
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            return (response as? HTTPURLResponse)?.statusCode == 200
        } catch {
            return false
        }
    }
    
    // MARK: - API Key Setup Helper
    func setAPIKey(_ key: String, for service: APIService) {
        KeychainManager.shared.setAPIKey(key, for: service.keychainKey)
    }
    
    func hasValidAPIKey(for service: APIService) -> Bool {
        let key = getAPIKey(for: service, fallback: "")
        return !key.isEmpty && !key.contains("YOUR_") && !key.contains("API_KEY_HERE")
    }
    
    // MARK: - Cost Tracking
    func logAPIUsage(service: APIService, tokens: Int? = nil, requests: Int = 1) {
        let usage = APIUsage(
            service: service,
            timestamp: Date(),
            requests: requests,
            tokens: tokens
        )
        
        APIUsageTracker.shared.log(usage)
    }
}

// MARK: - API Service Enumeration
enum APIService: String, CaseIterable {
    case chatbot = "chatbot"
    case imageGeneration = "image_generation"
    case vision = "vision"
    case speechToText = "speech_to_text"
    case textToSpeech = "text_to_speech"
    case elevenLabs = "eleven_labs"
    case anthropic = "anthropic"
    case replicate = "replicate"
    case assemblyAI = "assembly_ai"
    
    var environmentKey: String {
        switch self {
        case .chatbot: return "OPENAI_CHATBOT_API_KEY"
        case .imageGeneration: return "OPENAI_IMAGE_API_KEY"
        case .vision: return "OPENAI_VISION_API_KEY"
        case .speechToText: return "OPENAI_STT_API_KEY"
        case .textToSpeech: return "OPENAI_TTS_API_KEY"
        case .elevenLabs: return "ELEVENLABS_API_KEY"
        case .anthropic: return "ANTHROPIC_API_KEY"
        case .replicate: return "REPLICATE_API_KEY"
        case .assemblyAI: return "ASSEMBLY_AI_API_KEY"
        }
    }
    
    var keychainKey: String {
        return "aura_\(self.rawValue)_key"
    }
    
    var displayName: String {
        switch self {
        case .chatbot: return "Chatbot (GPT-5-nano)"
        case .imageGeneration: return "Image Generation (GPT-image-1)"
        case .vision: return "Vision Analysis (GPT-4o-mini-vision)"
        case .speechToText: return "Speech-to-Text (GPT-4o-mini-transcribe)"
        case .textToSpeech: return "Text-to-Speech (GPT-4o-mini-tts)"
        case .elevenLabs: return "Voice Synthesis (ElevenLabs)"
        case .anthropic: return "Alternative Chatbot (Claude)"
        case .replicate: return "Alternative Image Gen (Replicate)"
        case .assemblyAI: return "Alternative STT (AssemblyAI)"
        }
    }
}

// MARK: - Keychain Manager
class KeychainManager {
    static let shared = KeychainManager()
    private init() {}
    
    func setAPIKey(_ key: String, for service: String) {
        let data = key.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "AURA-API-Keys",
            kSecAttrAccount as String: service,
            kSecValueData as String: data
        ]
        
        // Delete existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        SecItemAdd(query as CFDictionary, nil)
    }
    
    func getAPIKey(for service: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "AURA-API-Keys",
            kSecAttrAccount as String: service,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let key = String(data: data, encoding: .utf8) {
            return key
        }
        
        return nil
    }
    
    func deleteAPIKey(for service: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "AURA-API-Keys",
            kSecAttrAccount as String: service
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - API Usage Tracking
class APIUsageTracker: ObservableObject {
    static let shared = APIUsageTracker()
    private init() {}
    
    @Published var dailyUsage: [APIService: Int] = [:]
    @Published var monthlyUsage: [APIService: Int] = [:]
    
    private let userDefaults = UserDefaults.standard
    
    func log(_ usage: APIUsage) {
        // Log for cost tracking and analytics
        updateDailyUsage(usage)
        updateMonthlyUsage(usage)
        
        // Store in UserDefaults for persistence
        saveUsageData()
        
        print("📊 API Usage - \(usage.service.displayName): \(usage.requests) requests, \(usage.tokens ?? 0) tokens")
    }
    
    private func updateDailyUsage(_ usage: APIUsage) {
        let current = dailyUsage[usage.service] ?? 0
        dailyUsage[usage.service] = current + usage.requests
    }
    
    private func updateMonthlyUsage(_ usage: APIUsage) {
        let current = monthlyUsage[usage.service] ?? 0
        monthlyUsage[usage.service] = current + usage.requests
    }
    
    private func saveUsageData() {
        // Convert to saveable format
        let dailyData = dailyUsage.mapKeys { $0.rawValue }
        let monthlyData = monthlyUsage.mapKeys { $0.rawValue }
        
        userDefaults.set(dailyData, forKey: "daily_api_usage")
        userDefaults.set(monthlyData, forKey: "monthly_api_usage")
    }
    
    func resetDailyUsage() {
        dailyUsage.removeAll()
        userDefaults.removeObject(forKey: "daily_api_usage")
    }
    
    func resetMonthlyUsage() {
        monthlyUsage.removeAll()
        userDefaults.removeObject(forKey: "monthly_api_usage")
    }
    
    func getEstimatedCost() -> Double {
        // Rough cost estimation based on usage
        var totalCost = 0.0
        
        for (service, requests) in dailyUsage {
            switch service {
            case .chatbot:
                totalCost += Double(requests) * 0.002 // ~$0.002 per request
            case .imageGeneration:
                totalCost += Double(requests) * 0.02  // ~$0.02 per image
            case .vision:
                totalCost += Double(requests) * 0.003 // ~$0.003 per vision request
            case .speechToText:
                totalCost += Double(requests) * 0.006 // ~$0.006 per minute
            case .textToSpeech:
                totalCost += Double(requests) * 0.015 // ~$0.015 per 1K characters
            case .elevenLabs:
                totalCost += Double(requests) * 0.018 // ~$0.018 per 1K characters
            default:
                totalCost += Double(requests) * 0.001 // Generic cost
            }
        }
        
        return totalCost
    }
}

// MARK: - Data Models
struct APIUsage {
    let service: APIService
    let timestamp: Date
    let requests: Int
    let tokens: Int?
}

// MARK: - Extensions
extension Dictionary {
    func mapKeys<T>(_ transform: (Key) -> T) -> [T: Value] {
        var result: [T: Value] = [:]
        for (key, value) in self {
            result[transform(key)] = value
        }
        return result
    }
}