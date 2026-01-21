import Foundation
import AVFoundation

class AudioManager: ObservableObject {
    private let speechSynthesizer = AVSpeechSynthesizer()
    
    func playFeedback(isCorrect: Bool, emotion: String) {
        let message = isCorrect ? "Correct! That's \(emotion)!" : "Good try! The answer is \(emotion)"
        speak(message)
    }
    
    func playEmotionDescription(_ emotion: String) {
        speak("Show me \(emotion)")
    }
    
    func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.5
        speechSynthesizer.speak(utterance)
    }
    
    func stopSpeaking() {
        speechSynthesizer.stopSpeaking(at: .immediate)
    }
}