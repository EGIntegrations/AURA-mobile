import Foundation
import UIKit
import SwiftUI

class ImageDatasetManager: ObservableObject {
    @Published var isLoading = false
    @Published var error: Error?

    var supportedEmotions: [String] {
        return ["happy", "sad", "angry", "surprised", "fear", "neutral"]
    }

    var kaggleDatasetURL: URL {
        // Use app bundle for iOS compatibility
        return Bundle.main.url(forResource: "EmotionImages", withExtension: nil) ?? 
               URL(fileURLWithPath: "/Users/elliottgodwin/Desktop/AutismTrainer/datasets/kaggle")
    }
    
    init() {
        // No longer generating sample images - using real kaggle dataset
        debugBundleContents()
    }
    
    private func debugBundleContents() {
        print("DEBUG: === Bundle Contents Debug ===")
        if let bundlePath = Bundle.main.resourcePath {
            print("DEBUG: Bundle resource path: \(bundlePath)")
            
            // List ALL files in the bundle
            do {
                let allFiles = try FileManager.default.contentsOfDirectory(atPath: bundlePath)
                print("DEBUG: All files in bundle: \(allFiles)")
            } catch {
                print("DEBUG: Error reading bundle: \(error)")
            }
            
            // Check if EmotionImages folder exists
            let datasetPath = bundlePath + "/EmotionImages"
            if FileManager.default.fileExists(atPath: datasetPath) {
                print("DEBUG: EmotionImages folder found in bundle")
                do {
                    let contents = try FileManager.default.contentsOfDirectory(atPath: datasetPath)
                    print("DEBUG: EmotionImages contents: \(contents)")
                } catch {
                    print("DEBUG: Error reading EmotionImages: \(error)")
                }
            } else {
                print("DEBUG: EmotionImages folder NOT found in bundle")
            }
            
            // Check for individual image files in root
            let imageNames = ["happy.png", "sad.png", "anger.png", "suprised.png", "fear.png", "neutral.png"]
            for imageName in imageNames {
                if let imagePath = Bundle.main.path(forResource: imageName.replacingOccurrences(of: ".png", with: ""), ofType: "png") {
                    print("DEBUG: Found \(imageName) at: \(imagePath)")
                } else {
                    print("DEBUG: \(imageName) NOT found in bundle")
                }
            }
        }
        print("DEBUG: === End Bundle Debug ===")
    }
    
    
    // MARK: - Public Methods
    
    func loadImagesForEmotion(_ emotion: String) -> [GameQuestion] {
        var questions: [GameQuestion] = []
        
        // Map emotion names to file names (handling variations)
        let emotionMapping = [
            "happy": "happy.png",
            "sad": "sad.png", 
            "angry": "anger.png",
            "surprised": "suprised.png", // Note: keeping the typo from the filename
            "fear": "fear.png",
            "neutral": "neutral.png"
        ]
        
        guard let fileName = emotionMapping[emotion.lowercased()] else {
            print("No mapping found for emotion: \(emotion)")
            // Create multiple fallback questions for variety
            return createMultipleFallbackQuestions(for: emotion)
        }
        
        // Try to load from app bundle first
        let imageName = fileName.replacingOccurrences(of: ".png", with: "")
        var imageData: Data?
        
        // Try to find the image in the EmotionImages subdirectory
        if let bundlePath = Bundle.main.path(forResource: imageName, ofType: "png", inDirectory: "EmotionImages") {
            print("DEBUG: Found image in app bundle at path: \(bundlePath)")
            do {
                imageData = try Data(contentsOf: URL(fileURLWithPath: bundlePath))
                print("DEBUG: Successfully loaded \(imageData?.count ?? 0) bytes from app bundle for \(emotion)")
            } catch {
                print("DEBUG: Error loading from app bundle: \(error)")
            }
        } else {
            print("DEBUG: Could not find \(imageName).png in EmotionImages directory in app bundle")
            // Debug: List what's actually in the bundle
            if let bundlePath = Bundle.main.path(forResource: "EmotionImages", ofType: nil) {
                print("DEBUG: EmotionImages folder found at: \(bundlePath)")
                do {
                    let contents = try FileManager.default.contentsOfDirectory(atPath: bundlePath)
                    print("DEBUG: Contents of EmotionImages folder: \(contents)")
                } catch {
                    print("DEBUG: Error reading EmotionImages folder: \(error)")
                }
            } else {
                print("DEBUG: EmotionImages folder not found in app bundle")
            }
        }
        
        // If not found in bundle, try external path
        if imageData == nil {
            let imagePath = kaggleDatasetURL.appendingPathComponent(fileName)
            print("DEBUG: Attempting to load image at external path: \(imagePath)")
            do {
                imageData = try Data(contentsOf: imagePath)
                print("DEBUG: Successfully loaded \(imageData?.count ?? 0) bytes from external path for \(emotion)")
            } catch {
                print("DEBUG: Error loading from external path: \(error)")
            }
        }
        
        if let imageData = imageData {
            // Create multiple questions with the same image for variety
            for i in 1...3 {
                let question = GameQuestion(
                    imageName: "\(fileName)_\(i)",
                    correctEmotion: emotion,
                    difficulty: i,
                    imageData: imageData
                )
                questions.append(question)
            }
            print("Successfully loaded \(questions.count) questions for \(emotion) from kaggle dataset")
        } else {
            print("Failed to load image for \(emotion), using fallback")
            // Fallback: create multiple questions with generated images
            questions = createMultipleFallbackQuestions(for: emotion)
            print("DEBUG: Created \(questions.count) fallback questions for \(emotion)")
        }
        
        return questions
    }
    
    private func createMultipleFallbackQuestions(for emotion: String) -> [GameQuestion] {
        var questions: [GameQuestion] = []
        
        // Create 3 fallback questions with different styles
        for i in 1...3 {
            if let fallbackQuestion = createFallbackQuestion(for: emotion, variation: i) {
                questions.append(fallbackQuestion)
            }
        }
        
        return questions
    }
    
    private func createFallbackQuestion(for emotion: String, variation: Int = 1) -> GameQuestion? {
        let size = CGSize(width: 300, height: 300)
        let renderer = UIGraphicsImageRenderer(size: size)
        
        let image = renderer.image { context in
            // Background color based on emotion with variation
            let backgroundColor = getColorForEmotion(emotion, variation: variation)
            backgroundColor.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            
            // Draw emoji
            let emoji = getEmojiForEmotion(emotion)
            let fontSize: CGFloat = variation == 1 ? 120 : (variation == 2 ? 100 : 140)
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: fontSize),
                .foregroundColor: UIColor.white
            ]
            
            let attributedString = NSAttributedString(string: emoji, attributes: attributes)
            let stringSize = attributedString.size()
            let rect = CGRect(
                x: (size.width - stringSize.width) / 2,
                y: (size.height - stringSize.height) / 2,
                width: stringSize.width,
                height: stringSize.height
            )
            
            attributedString.draw(in: rect)
        }
        
        if let imageData = image.pngData() {
            return GameQuestion(
                imageName: "fallback_\(emotion)_\(variation).png",
                correctEmotion: emotion,
                difficulty: variation,
                imageData: imageData
            )
        }
        
        return nil
    }
    
    private func getColorForEmotion(_ emotion: String, variation: Int = 1) -> UIColor {
        switch emotion.lowercased() {
        case "happy": 
            return variation == 1 ? .systemYellow : (variation == 2 ? .systemOrange : .systemYellow)
        case "sad": 
            return variation == 1 ? .systemBlue : (variation == 2 ? .systemTeal : .systemBlue)
        case "angry": 
            return variation == 1 ? .systemRed : (variation == 2 ? .systemPink : .systemRed)
        case "surprised": 
            return variation == 1 ? .systemOrange : (variation == 2 ? .systemYellow : .systemOrange)
        case "fear": 
            return variation == 1 ? .systemPurple : (variation == 2 ? .systemIndigo : .systemPurple)
        case "neutral": 
            return variation == 1 ? .systemGray : (variation == 2 ? .systemGray2 : .systemGray)
        default: 
            return .systemGray
        }
    }
    
    private func getEmojiForEmotion(_ emotion: String) -> String {
        switch emotion.lowercased() {
        case "happy": return "😊"
        case "sad": return "😢"
        case "angry": return "😠"
        case "surprised": return "😮"
        case "fear": return "😨"
        case "neutral": return "😐"
        default: return "🙂"
        }
    }
    
    func getAllQuestions() -> [GameQuestion] {
        let emotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        var allQuestions: [GameQuestion] = []
        
        print("DEBUG: Starting to load questions for all emotions")
        
        for emotion in emotions {
            let emotionQuestions = loadImagesForEmotion(emotion)
            allQuestions.append(contentsOf: emotionQuestions)
            print("DEBUG: Total questions after loading \(emotion): \(allQuestions.count)")
        }
        
        print("DEBUG: Final question count: \(allQuestions.count)")
        
        // Test the first question to see if it has real image data
        if let firstQuestion = allQuestions.first {
            print("DEBUG: First question image name: \(firstQuestion.imageName)")
            print("DEBUG: First question has image data: \(firstQuestion.imageData != nil)")
            if let imageData = firstQuestion.imageData {
                print("DEBUG: First question image data size: \(imageData.count) bytes")
            }
        }
        
        return allQuestions.shuffled()
    }
    
    func addCustomImage(_ image: UIImage, emotion: String) {
        let emotionFolder = kaggleDatasetURL.appendingPathComponent(emotion.lowercased())
        
        do {
            try FileManager.default.createDirectory(at: emotionFolder, withIntermediateDirectories: true, attributes: nil)
            
            let timestamp = Int(Date().timeIntervalSince1970)
            let imageName = "\(emotion.lowercased())_custom_\(timestamp).jpg"
            let imagePath = emotionFolder.appendingPathComponent(imageName)
            
            if let imageData = image.jpegData(compressionQuality: 0.8) {
                try imageData.write(to: imagePath)
            }
        } catch {
            print("Error saving custom image: \(error)")
            self.error = error
        }
    }
    
    func downloadDataset(from url: URL) {
        isLoading = true
        error = nil
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                if let error = error {
                    self?.error = error
                    return
                }
                
                guard let data = data else {
                    self?.error = NSError(domain: "ImageDatasetManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "No data received"])
                    return
                }
                
                // Process the downloaded data
                // This would typically be a ZIP file that needs to be extracted
                // For now, we'll just save it as a reference
                let downloadPath = self?.kaggleDatasetURL.appendingPathComponent("downloaded_dataset.zip")
                do {
                    try data.write(to: downloadPath!)
                    print("Dataset downloaded successfully")
                } catch {
                    self?.error = error
                }
            }
        }.resume()
    }
}

// MARK: - Extensions

extension ImageDatasetManager {
    func getDatasetStats() -> (totalImages: Int, emotionCounts: [String: Int]) {
        let emotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        var emotionCounts: [String: Int] = [:]
        var totalImages = 0
        
        for emotion in emotions {
            let emotionFolder = kaggleDatasetURL.appendingPathComponent(emotion)
            do {
                let imageFiles = try FileManager.default.contentsOfDirectory(at: emotionFolder, includingPropertiesForKeys: nil)
                let count = imageFiles.filter { $0.pathExtension.lowercased() == "jpg" || $0.pathExtension.lowercased() == "png" }.count
                emotionCounts[emotion] = count
                totalImages += count
            } catch {
                emotionCounts[emotion] = 0
            }
        }
        
        return (totalImages: totalImages, emotionCounts: emotionCounts)
    }
}