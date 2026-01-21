import Foundation
import UIKit
import SwiftUI

struct GameQuestion: Identifiable, Codable {
    var id = UUID()
    let imageName: String
    let correctEmotion: String
    let difficulty: Int
    let imageData: Data?

    init(imageName: String, correctEmotion: String, difficulty: Int, imageData: Data? = nil) {
        self.imageName = imageName
        self.correctEmotion = correctEmotion
        self.difficulty = difficulty
        self.imageData = imageData
    }
}

struct Emotion: Identifiable, Codable {
    var id = UUID()
    let name: String
    let emoji: String
    let description: String
    let colorName: String
    
    var color: Color {
        switch colorName {
        case "yellow": return .yellow
        case "blue": return .blue
        case "red": return .red
        case "orange": return .orange
        case "purple": return .purple
        case "gray": return .gray
        default: return .gray
        }
    }
    
    static let allEmotions = [
        Emotion(name: "Happy", emoji: "😊", description: "Feeling joy and contentment", colorName: "yellow"),
        Emotion(name: "Sad", emoji: "😢", description: "Feeling sorrow or unhappy", colorName: "blue"),
        Emotion(name: "Angry", emoji: "😠", description: "Feeling mad or frustrated", colorName: "red"),
        Emotion(name: "Surprised", emoji: "😮", description: "Feeling amazed or shocked", colorName: "orange"),
        Emotion(name: "Fear", emoji: "😨", description: "Feeling scared or worried", colorName: "purple"),
        Emotion(name: "Neutral", emoji: "😐", description: "Feeling calm and balanced", colorName: "gray")
    ]
}