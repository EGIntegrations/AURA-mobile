import Foundation
import Intents
import Speech
import AVFoundation

// MARK: - Notification Extensions
extension Notification.Name {
    static let startGameCommand = Notification.Name("startGameCommand")
    static let practiceEmotionCommand = Notification.Name("practiceEmotionCommand")  
    static let checkProgressCommand = Notification.Name("checkProgressCommand")
    static let helpCommand = Notification.Name("helpCommand")
}

class SiriKitManager: NSObject, ObservableObject {
    @Published var isListening = false
    @Published var transcribedText = ""
    @Published var recognizedEmotion: String?
    @Published var error: SiriKitError?
    
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    
    override init() {
        super.init()
        setupSpeechRecognizer()
        registerIntents()
    }
    
    // MARK: - Speech Recognition Setup
    
    private func setupSpeechRecognizer() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.delegate = self
    }
    
    private func registerIntents() {
        // Register custom intents for AURA
        let shortcuts = [
            createStartGameIntent(),
            createPracticeEmotionIntent(),
            createCheckProgressIntent(),
            createHelpIntent()
        ].compactMap { $0 }
        
        INVoiceShortcutCenter.shared.setShortcutSuggestions(shortcuts)
    }
    
    // MARK: - Intent Creation
    
    private func createStartGameIntent() -> INShortcut? {
        let intent = StartGameIntent()
        intent.suggestedInvocationPhrase = "Start AURA game"
        
        if let shortcut = INShortcut(intent: intent) {
            return shortcut
        }
        return nil
    }
    
    private func createPracticeEmotionIntent() -> INShortcut? {
        let intent = PracticeEmotionIntent()
        intent.suggestedInvocationPhrase = "Practice emotions with AURA"
        
        if let shortcut = INShortcut(intent: intent) {
            return shortcut
        }
        return nil
    }
    
    private func createCheckProgressIntent() -> INShortcut? {
        let intent = CheckProgressIntent()
        intent.suggestedInvocationPhrase = "Check my AURA progress"
        
        if let shortcut = INShortcut(intent: intent) {
            return shortcut
        }
        return nil
    }
    
    private func createHelpIntent() -> INShortcut? {
        let intent = HelpIntent()
        intent.suggestedInvocationPhrase = "Get help with AURA"
        
        if let shortcut = INShortcut(intent: intent) {
            return shortcut
        }
        return nil
    }
    
    // MARK: - Speech Recognition
    
    func requestSpeechPermission() {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                switch authStatus {
                case .authorized:
                    break
                case .denied:
                    self.error = .speechRecognitionDenied
                case .restricted:
                    self.error = .speechRecognitionRestricted
                case .notDetermined:
                    self.error = .speechRecognitionNotDetermined
                @unknown default:
                    self.error = .speechRecognitionDenied
                }
            }
        }
    }
    
    func startListening() {
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            error = .speechRecognitionUnavailable
            return
        }
        
        do {
            try startRecognition()
        } catch {
            self.error = .speechRecognitionFailed(error.localizedDescription)
        }
    }
    
    private func startRecognition() throws {
        // Cancel any previous recognition task
        if let recognitionTask = recognitionTask {
            recognitionTask.cancel()
            self.recognitionTask = nil
        }
        
        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw SiriKitError.speechRecognitionFailed("Unable to create recognition request")
        }
        
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio engine
        let inputNode = audioEngine.inputNode
        inputNode.removeTap(onBus: 0)
        
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        audioEngine.prepare()
        try audioEngine.start()
        
        isListening = true
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            DispatchQueue.main.async {
                if let result = result {
                    self?.transcribedText = result.bestTranscription.formattedString
                    self?.processEmotionRecognition(result.bestTranscription.formattedString)
                    
                    if result.isFinal {
                        self?.stopListening()
                    }
                }
                
                if let error = error {
                    self?.error = .speechRecognitionFailed(error.localizedDescription)
                    self?.stopListening()
                }
            }
        }
    }
    
    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isListening = false
        
        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("Error deactivating audio session: \(error)")
        }
    }
    
    // MARK: - Emotion Recognition
    
    private func processEmotionRecognition(_ text: String) {
        let emotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        let lowercasedText = text.lowercased()
        
        for emotion in emotions {
            if lowercasedText.contains(emotion) {
                recognizedEmotion = emotion
                return
            }
        }
        
        // Check for synonyms
        let synonyms = [
            "happy": ["joy", "glad", "cheerful", "delighted", "pleased"],
            "sad": ["upset", "crying", "depressed", "unhappy", "down"],
            "angry": ["mad", "furious", "rage", "annoyed", "irritated"],
            "surprised": ["shocked", "amazed", "astonished", "startled"],
            "fear": ["scared", "afraid", "frightened", "worried", "anxious"],
            "neutral": ["calm", "normal", "plain", "relaxed"]
        ]
        
        for (emotion, synonymList) in synonyms {
            for synonym in synonymList {
                if lowercasedText.contains(synonym) {
                    recognizedEmotion = emotion
                    return
                }
            }
        }
    }
    
    // MARK: - Voice Commands
    
    func handleVoiceCommand(_ command: String) {
        let lowercasedCommand = command.lowercased()
        
        switch lowercasedCommand {
        case let cmd where cmd.contains("start game"):
            NotificationCenter.default.post(name: .startGameCommand, object: nil)
        case let cmd where cmd.contains("practice emotion"):
            NotificationCenter.default.post(name: .practiceEmotionCommand, object: nil)
        case let cmd where cmd.contains("check progress"):
            NotificationCenter.default.post(name: .checkProgressCommand, object: nil)
        case let cmd where cmd.contains("help"):
            NotificationCenter.default.post(name: .helpCommand, object: nil)
        default:
            break
        }
    }
    
    // MARK: - Text-to-Speech
    
    func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = 0.5
        utterance.pitchMultiplier = 1.0
        utterance.volume = 0.8
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        
        let synthesizer = AVSpeechSynthesizer()
        synthesizer.speak(utterance)
    }
    
    func speakEmotionHelp(for emotion: String) {
        let helpText = getEmotionHelpText(for: emotion)
        speak(helpText)
    }
    
    private func getEmotionHelpText(for emotion: String) -> String {
        switch emotion.lowercased() {
        case "happy":
            return "Happy faces show smiling mouths and bright eyes. Look for raised cheeks and crinkled eyes."
        case "sad":
            return "Sad faces have downturned mouths and droopy eyes. The eyebrows might be angled down."
        case "angry":
            return "Angry faces show frowning mouths and tense eyes. The eyebrows are usually lowered and drawn together."
        case "surprised":
            return "Surprised faces have wide open eyes and mouths. The eyebrows are raised high."
        case "fear":
            return "Fearful faces show wide eyes and worried expressions. The mouth might be slightly open."
        case "neutral":
            return "Neutral faces are relaxed with no strong emotion showing. The mouth and eyes are in a natural position."
        default:
            return "I can help you learn about emotions. Try saying the name of an emotion to learn more."
        }
    }
}

// MARK: - SFSpeechRecognizerDelegate

extension SiriKitManager: SFSpeechRecognizerDelegate {
    func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
        if !available {
            error = .speechRecognitionUnavailable
        }
    }
}

// MARK: - Custom Intents

class StartGameIntent: INIntent {
    override var suggestedInvocationPhrase: String? {
        get { return "Start AURA game" }
        set { }
    }
}

class PracticeEmotionIntent: INIntent {
    override var suggestedInvocationPhrase: String? {
        get { return "Practice emotions with AURA" }
        set { }
    }
}

class CheckProgressIntent: INIntent {
    override var suggestedInvocationPhrase: String? {
        get { return "Check my AURA progress" }
        set { }
    }
}

class HelpIntent: INIntent {
    override var suggestedInvocationPhrase: String? {
        get { return "Get help with AURA" }
        set { }
    }
}

// MARK: - Error Handling

enum SiriKitError: Error, LocalizedError {
    case speechRecognitionDenied
    case speechRecognitionRestricted
    case speechRecognitionNotDetermined
    case speechRecognitionUnavailable
    case speechRecognitionFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .speechRecognitionDenied:
            return "Speech recognition permission denied"
        case .speechRecognitionRestricted:
            return "Speech recognition is restricted"
        case .speechRecognitionNotDetermined:
            return "Speech recognition permission not determined"
        case .speechRecognitionUnavailable:
            return "Speech recognition is not available"
        case .speechRecognitionFailed(let message):
            return "Speech recognition failed: \(message)"
        }
    }
}
