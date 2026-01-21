import Foundation
import AVFoundation
import Speech

// MARK: - Real-time Conversation Service
class ConversationService: ObservableObject {
    static let shared = ConversationService()
    
    @Published var isActive = false
    @Published var currentConversation: Conversation?
    @Published var conversationHistory: [ConversationMessage] = []
    @Published var isListening = false
    @Published var isProcessing = false
    @Published var lastError: String?

    private let openAIService = OpenAIService.shared
    private let elevenLabsService = ElevenLabsService.shared
    private let audioEngine = AVAudioEngine()
    private let speechRecognizer = ConversationSpeechRecognitionManager()
    private let audioSession = AVAudioSession.sharedInstance()

    enum ConversationServiceError: Error {
        case microphoneDenied
    }
    
    // MARK: - Conversation Management
    func startConversation(scenario: ConversationScenario, userLevel: UserLevel) async throws {
        currentConversation = Conversation(
            id: UUID(),
            scenario: scenario,
            userLevel: userLevel,
            startTime: Date()
        )
        
        conversationHistory.removeAll()
        isActive = true
        
        let openingMessage: ConversationMessage
        do {
            openingMessage = try await generateOpeningMessage(for: scenario, userLevel: userLevel)
        } catch {
            openingMessage = fallbackOpeningMessage(for: scenario)
        }

        await addMessageToHistory(openingMessage)
        try? await elevenLabsService.playConversationResponse(openingMessage.content, tone: .supportive)
    }
    
    func endConversation() {
        isActive = false
        stopListening()
        currentConversation?.endTime = Date()
        
        // Generate conversation summary
        Task {
            await generateConversationSummary()
        }
    }
    
    // MARK: - Voice Interaction
    func startListening() async throws {
        guard !isListening else { return }
        try await configureAudioSession()

        isListening = true
        
        try await speechRecognizer.startRecording { [weak self] (recognizedText: String) in
            Task { @MainActor in
                if !recognizedText.isEmpty {
                    self?.isListening = false
                    await self?.processUserInput(recognizedText)
                }
            }
        }
    }
    
    func stopListening() {
        speechRecognizer.stopRecording()
        isListening = false
        try? audioSession.setActive(false, options: [.notifyOthersOnDeactivation])
    }
    
    func processUserMessage(_ message: String) async -> String {
        await processUserInput(message)
        // Return the AI's response from conversation history
        return conversationHistory.last?.content ?? "I'm sorry, I didn't understand that."
    }
    
    private func processUserInput(_ input: String) async {
        guard let conversation = currentConversation else { return }
        
        isProcessing = true
        defer { isProcessing = false }
        
        // Add user message to history
        let userMessage = ConversationMessage(
            id: UUID(),
            content: input,
            sender: .user,
            timestamp: Date(),
            emotionalTone: .neutral
        )
        await addMessageToHistory(userMessage)
        
        do {
            // Generate AI response
            let context = ConversationContext(
                userEmotionalState: "engaged", // TODO: Get from UserMonitoringService
                topic: conversation.scenario.topic,
                userLevel: conversation.userLevel.description
            )
            
            let response = try await openAIService.generateConversationResponse(userInput: input, context: context)

            let aiMessage = ConversationMessage(
                id: UUID(),
                content: response.text,
                sender: .assistant,
                timestamp: Date(),
                emotionalTone: response.emotionalTone
            )
            await addMessageToHistory(aiMessage)

            try? await elevenLabsService.playConversationResponse(response.text, tone: response.emotionalTone)
            
            // Auto-restart listening for continued conversation
            if isActive {
                try await startListening()
            }
            
        } catch {
            print("Error processing user input: \(error)")
            await MainActor.run { self.lastError = error.localizedDescription }
            let fallbackMessage = fallbackResponse(for: input)
            await addMessageToHistory(fallbackMessage)
            try? await elevenLabsService.playConversationResponse(fallbackMessage.content, tone: .supportive)
        }
    }

    private func configureAudioSession() async throws {
        let permissionGranted = await requestMicrophoneAccess()
        guard permissionGranted else { throw ConversationServiceError.microphoneDenied }

        try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true, options: [.notifyOthersOnDeactivation])
    }

    private func requestMicrophoneAccess() async -> Bool {
        await withCheckedContinuation { continuation in
            audioSession.requestRecordPermission { allowed in
                continuation.resume(returning: allowed)
            }
        }
    }
    
    // MARK: - Message Generation
    private func generateOpeningMessage(for scenario: ConversationScenario, userLevel: UserLevel) async throws -> ConversationMessage {
        let prompt = """
        Generate a friendly opening message for a conversation practice scenario.
        
        Scenario: \(scenario.description)
        User Level: \(userLevel.description)
        Goal: Help the user practice \(scenario.goal)
        
        Create a warm, encouraging opening that:
        1. Sets up the scenario naturally
        2. Uses language appropriate for the user's level
        3. Encourages the user to respond
        4. Feels like a real conversation starter
        
        Keep it under 30 words and make it conversational.
        """
        
        let response = try await openAIService.generateConversationResponse(
            userInput: prompt,
            context: ConversationContext(
                userEmotionalState: "ready",
                topic: scenario.topic,
                userLevel: userLevel.description
            )
        )
        
        return ConversationMessage(
            id: UUID(),
            content: response.text,
            sender: .assistant,
            timestamp: Date(),
            emotionalTone: response.emotionalTone
        )
    }
    
    private func generateConversationSummary() async {
        guard let conversation = currentConversation else { return }
        
        let messages = conversationHistory.map { "\($0.sender.rawValue): \($0.content)" }.joined(separator: "\n")
        
        let prompt = """
        Analyze this conversation practice session and provide feedback:
        
        Scenario: \(conversation.scenario.description)
        Duration: \(conversation.duration) seconds
        Messages: \(conversationHistory.count)
        
        Conversation:
        \(messages)
        
        Provide:
        1. What the user did well
        2. Areas for improvement
        3. Specific suggestions for next time
        4. Overall progress assessment
        
        Keep feedback positive and constructive.
        """
        
        do {
            let summaryResponse = try await openAIService.generateConversationResponse(
                userInput: prompt,
                context: ConversationContext(
                    userEmotionalState: "completed",
                    topic: "conversation_feedback",
                    userLevel: conversation.userLevel.description
                )
            )
            
            conversation.summary = summaryResponse.text
            
        } catch {
            print("Error generating conversation summary: \(error)")
        }
    }
    
    // MARK: - Helper Methods
    @MainActor
    private func addMessageToHistory(_ message: ConversationMessage) {
        conversationHistory.append(message)
        currentConversation?.messageCount += 1
    }
    
    private func handleConversationError(_ error: Error) async {
        let errorMessage = ConversationMessage(
            id: UUID(),
            content: "I'm sorry, I didn't catch that. Could you try saying that again?",
            sender: .assistant,
            timestamp: Date(),
            emotionalTone: .supportive
        )
        
        await addMessageToHistory(errorMessage)
        
        do {
            try await elevenLabsService.playConversationResponse(
                errorMessage.content,
                tone: .supportive
            )
        } catch {
            print("Error playing error message: \(error)")
        }
    }

    private func fallbackOpeningMessage(for scenario: ConversationScenario) -> ConversationMessage {
        let text: String
        switch scenario.topic {
        case "greetings":
            text = "Hi there! Let's practice greetings together. How would you like to start?"
        case "help_requests":
            text = "Hello! Tell me something you need help with and we'll practice asking together."
        case "emotions":
            text = "Let's talk about feelings. How are you feeling right now?"
        case "daily_life":
            text = "I'd love to hear about your day. What's one thing you did today?"
        default:
            text = "I'm ready to chat. What would you like to talk about today?"
        }
        return ConversationMessage(id: UUID(), content: text, sender: .assistant, timestamp: Date(), emotionalTone: .supportive)
    }

    private func fallbackResponse(for input: String) -> ConversationMessage {
        let lowercased = input.lowercased()
        let reply: String

        if lowercased.contains("hello") || lowercased.contains("hi") {
            reply = "Hello! It's nice to chat with you. How are you feeling right now?"
        } else if lowercased.contains("help") {
            reply = "Of course—what do you need help with? Let's practice asking together."
        } else if lowercased.contains("happy") || lowercased.contains("good") {
            reply = "That's wonderful! What made you feel happy today?"
        } else if lowercased.contains("sad") || lowercased.contains("upset") {
            reply = "I'm sorry you're feeling that way. Would you like to talk about it?"
        } else if lowercased.contains("thank") {
            reply = "You're welcome! I'm glad to practice with you."
        } else {
            reply = "That's interesting! Can you tell me a little more about that?"
        }

        return ConversationMessage(id: UUID(), content: reply, sender: .assistant, timestamp: Date(), emotionalTone: .supportive)
    }
    
    // MARK: - Conversation Scenarios
    func getAvailableScenarios(for userLevel: UserLevel) -> [ConversationScenario] {
        switch userLevel.level {
        case 1: // Beginner
            return [
                ConversationScenario(
                    id: "greeting",
                    title: "Saying Hello",
                    description: "Practice greeting someone new",
                    topic: "greetings",
                    goal: "Learn how to start a conversation",
                    difficulty: 1
                ),
                ConversationScenario(
                    id: "asking_help",
                    title: "Asking for Help",
                    description: "Practice asking for assistance",
                    topic: "help_requests",
                    goal: "Learn to ask for help politely",
                    difficulty: 1
                )
            ]
            
        case 2: // Intermediate
            return [
                ConversationScenario(
                    id: "small_talk",
                    title: "Making Small Talk",
                    description: "Practice casual conversation",
                    topic: "small_talk",
                    goal: "Learn to make friendly conversation",
                    difficulty: 2
                ),
                ConversationScenario(
                    id: "expressing_feelings",
                    title: "Sharing Feelings",
                    description: "Practice expressing emotions",
                    topic: "emotions",
                    goal: "Learn to communicate feelings",
                    difficulty: 2
                )
            ]
            
        case 3: // Advanced
            return [
                ConversationScenario(
                    id: "conflict_resolution",
                    title: "Resolving Disagreements",
                    description: "Practice handling conflicts",
                    topic: "conflict_resolution",
                    goal: "Learn to resolve disagreements calmly",
                    difficulty: 3
                ),
                ConversationScenario(
                    id: "job_interview",
                    title: "Job Interview",
                    description: "Practice professional conversations",
                    topic: "professional",
                    goal: "Learn workplace communication",
                    difficulty: 3
                )
            ]
            
        default:
            return getAvailableScenarios(for: UserLevel(level: 1, description: "Beginner"))
        }
    }
}

// MARK: - Speech Recognition Manager
class ConversationSpeechRecognitionManager: ObservableObject {
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let speechRecognizer = SFSpeechRecognizer()
    
    func startRecording(completion: @escaping (String) -> Void) async throws {
        // Request speech recognition permission
        let authStatus = await requestSpeechPermission()
        guard authStatus == .authorized else {
            throw ConversationError.speechPermissionDenied
        }
        
        audioEngine = AVAudioEngine()
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        
        guard let audioEngine = audioEngine,
              let recognitionRequest = recognitionRequest else {
            throw ConversationError.speechSetupFailed
        }
        
        let inputNode = audioEngine.inputNode
        recognitionRequest.shouldReportPartialResults = true
        
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
            if let result = result {
                let recognizedText = result.bestTranscription.formattedString
                if result.isFinal {
                    completion(recognizedText)
                }
            }
            
            if error != nil {
                self.stopRecording()
            }
        }
        
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        audioEngine.prepare()
        try audioEngine.start()
    }
    
    func stopRecording() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        
        audioEngine = nil
        recognitionRequest = nil
        recognitionTask = nil
    }
    
    private func requestSpeechPermission() async -> SFSpeechRecognizerAuthorizationStatus {
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }
}

// MARK: - Data Models
class Conversation: ObservableObject {
    let id: UUID
    let scenario: ConversationScenario
    let userLevel: UserLevel
    let startTime: Date
    var endTime: Date?
    var messageCount: Int = 0
    var summary: String?
    
    var duration: TimeInterval {
        return (endTime ?? Date()).timeIntervalSince(startTime)
    }
    
    init(id: UUID, scenario: ConversationScenario, userLevel: UserLevel, startTime: Date) {
        self.id = id
        self.scenario = scenario
        self.userLevel = userLevel
        self.startTime = startTime
    }
}

struct ConversationScenario: Equatable, Hashable {
    let id: String
    let title: String
    let description: String
    let topic: String
    let goal: String
    let difficulty: Int
}

struct ConversationMessage: Identifiable {
    let id: UUID
    let content: String
    let sender: MessageSender
    let timestamp: Date
    let emotionalTone: EmotionalTone
}

enum MessageSender: String {
    case user = "User"
    case assistant = "Assistant"
}

enum ConversationError: Error {
    case speechPermissionDenied
    case speechSetupFailed
    case processingError
}

// MARK: - Extensions
extension ConversationService {
    func exportConversationData() -> String {
        guard let conversation = currentConversation else { return "" }
        
        var export = """
        Conversation Practice Session
        Scenario: \(conversation.scenario.title)
        Date: \(conversation.startTime)
        Duration: \(Int(conversation.duration)) seconds
        Messages: \(conversation.messageCount)
        
        Conversation Log:
        """
        
        for message in conversationHistory {
            export += "\n[\(message.timestamp)] \(message.sender.rawValue): \(message.content)"
        }
        
        if let summary = conversation.summary {
            export += "\n\nSummary:\n\(summary)"
        }
        
        return export
    }
}
