import Foundation
import AVFAudio

/// *Very* small actor that says one encouraging sentence per label change
actor TherapyLLM {

    private let synth = AVSpeechSynthesizer()

    func respond(to expr: String) {
        let phrase = switch expr.lowercased() {
        case "happy": "I’m glad you’re happy!"
        case "sad":   "It’s okay to feel sad—let’s breathe together."
        case "angry": "I can see you’re upset. Let’s count to five."
        default:      "Great job—keep going!"
        }
        synth.speak(AVSpeechUtterance(string: phrase))
    }
}
