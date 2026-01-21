import Foundation
import UIKit

// MARK: - Image Generation Service (Replaces ImageDatasetManager)
class ImageGenerationService: ObservableObject {
    static let shared = ImageGenerationService()
    
    @Published var isLoading = false
    @Published var error: Error?
    @Published var generatedImages: [String: [Data]] = [:] // Cache for generated images
    
    private let openAIService = OpenAIService.shared
    private let cacheManager = ImageCacheManager()
    
    // MARK: - Image Loading Strategy
    enum ImageSource {
        case localDataset  // Use existing DatasetImages
        case generated     // Generate via OpenAI
        case safePerson    // Custom safe person generation
    }
    
    // MARK: - Load Images for Emotions
    func loadImagesForEmotion(_ emotion: String, source: ImageSource = .localDataset, count: Int = 3) async throws -> [GameQuestion] {
        switch source {
        case .localDataset:
            return loadLocalImages(for: emotion, count: count)
        case .generated:
            return try await generateImages(for: emotion, count: count)
        case .safePerson:
            return try await generateSafePersonImages(for: emotion, count: count)
        }
    }
    
    // MARK: - Local Dataset Loading (Fixed)
    private func loadLocalImages(for emotion: String, count: Int) -> [GameQuestion] {
        var questions: [GameQuestion] = []
        
        // Fixed emotion mapping to match actual filenames
        let emotionFileMapping = [
            "happy": "happy.png",
            "sad": "sad.png",
            "angry": "anger.png",      // Note: file is named "anger.png"
            "surprised": "suprised.png", // Note: keeping original typo
            "fear": "fear.png",
            "neutral": "neutral.png"
        ]
        
        guard let fileName = emotionFileMapping[emotion.lowercased()] else {
            print("No file mapping for emotion: \(emotion)")
            return createFallbackQuestions(for: emotion, count: count)
        }
        
        // Try to load from DatasetImages folder in the bundle
        let imageName = fileName.replacingOccurrences(of: ".png", with: "")
        
        // Try multiple bundle paths for DatasetImages
        var imagePath: String?
        
        // First try: Direct bundle resource
        imagePath = Bundle.main.path(forResource: imageName, ofType: "png", inDirectory: "DatasetImages")
        
        // Second try: Root bundle resource
        if imagePath == nil {
            imagePath = Bundle.main.path(forResource: imageName, ofType: "png")
        }
        
        // Third try: Manual bundle construction
        if imagePath == nil {
            if let bundlePath = Bundle.main.resourcePath {
                let testPath = bundlePath + "/DatasetImages/" + fileName
                if FileManager.default.fileExists(atPath: testPath) {
                    imagePath = testPath
                }
            }
        }
        
        if let validImagePath = imagePath {
            print("✅ Found real image for \(emotion) at: \(validImagePath)")
            
            do {
                let imageData = try Data(contentsOf: URL(fileURLWithPath: validImagePath))
                print("✅ Successfully loaded \(imageData.count) bytes for \(emotion)")
                
                // Create multiple questions with the same real image
                for i in 1...count {
                    let question = GameQuestion(
                        imageName: "\(emotion)_real_\(i)",
                        correctEmotion: emotion,
                        difficulty: i,
                        imageData: imageData
                    )
                    questions.append(question)
                }
                
                return questions
                
            } catch {
                print("❌ Error loading real image: \(error)")
            }
        } else {
            print("❌ Could not find \(imageName).png in DatasetImages folder")
            
            // Debug: Check what's actually in the bundle
            if let bundlePath = Bundle.main.resourcePath {
                print("Bundle path: \(bundlePath)")
                let datasetPath = bundlePath + "/DatasetImages"
                if FileManager.default.fileExists(atPath: datasetPath) {
                    do {
                        let contents = try FileManager.default.contentsOfDirectory(atPath: datasetPath)
                        print("DatasetImages contents: \(contents)")
                    } catch {
                        print("Error reading DatasetImages: \(error)")
                    }
                }
            }
        }
        
        // Fallback to generated images if local loading fails
        print("⚠️ Using fallback for \(emotion)")
        return createFallbackQuestions(for: emotion, count: count)
    }
    
    // MARK: - OpenAI Image Generation
    private func generateImages(for emotion: String, count: Int) async throws -> [GameQuestion] {
        var questions: [GameQuestion] = []
        
        // Check cache first
        if let cachedImages = generatedImages[emotion], cachedImages.count >= count {
            for i in 0..<count {
                let question = GameQuestion(
                    imageName: "\(emotion)_generated_\(i+1)",
                    correctEmotion: emotion,
                    difficulty: 1,
                    imageData: cachedImages[i]
                )
                questions.append(question)
            }
            return questions
        }
        
        // Generate new images
        isLoading = true
        defer { isLoading = false }
        
        var generatedImageData: [Data] = []
        
        for i in 1...count {
            do {
                let imageData = try await openAIService.generateEmotionImage(
                    emotion: emotion, 
                    style: .photorealistic
                )
                generatedImageData.append(imageData)
                
                let question = GameQuestion(
                    imageName: "\(emotion)_generated_\(i)",
                    correctEmotion: emotion,
                    difficulty: 1,
                    imageData: imageData
                )
                questions.append(question)
                
            } catch {
                print("Error generating image \(i) for \(emotion): \(error)")
                // Use fallback for failed generations
                if let fallback = createSingleFallbackQuestion(for: emotion, variation: i) {
                    questions.append(fallback)
                }
            }
        }
        
        // Cache generated images
        if !generatedImageData.isEmpty {
            generatedImages[emotion] = generatedImageData
            cacheManager.saveToCache(images: generatedImageData, for: emotion)
        }
        
        return questions
    }
    
    // MARK: - Safe Person Image Generation (Premium Feature)
    private func generateSafePersonImages(for emotion: String, count: Int) async throws -> [GameQuestion] {
        guard let safePersonReference = UserDefaults.standard.data(forKey: "safe_person_reference") else {
            throw ImageGenerationError.noSafePersonReference
        }
        
        var questions: [GameQuestion] = []
        isLoading = true
        defer { isLoading = false }
        
        // This would use the safe person's face as a base
        let emotions = [emotion] // Could expand to related emotions
        let imageResults = try await openAIService.generateSafePersonEmotions(
            baseFaceData: safePersonReference, 
            emotions: emotions
        )
        
        if let imageData = imageResults[emotion] {
            for i in 1...count {
                let question = GameQuestion(
                    imageName: "\(emotion)_safeperson_\(i)",
                    correctEmotion: emotion,
                    difficulty: 1,
                    imageData: imageData
                )
                questions.append(question)
            }
        }
        
        return questions
    }
    
    // MARK: - Fallback Image Creation
    private func createFallbackQuestions(for emotion: String, count: Int) -> [GameQuestion] {
        var questions: [GameQuestion] = []
        
        for i in 1...count {
            if let question = createSingleFallbackQuestion(for: emotion, variation: i) {
                questions.append(question)
            }
        }
        
        return questions
    }
    
    private func createSingleFallbackQuestion(for emotion: String, variation: Int) -> GameQuestion? {
        let size = CGSize(width: 400, height: 400)
        let renderer = UIGraphicsImageRenderer(size: size)
        
        let image = renderer.image { context in
            // Modern gradient background
            let gradient = getGradientForEmotion(emotion, variation: variation)
            context.cgContext.drawLinearGradient(
                gradient,
                start: CGPoint(x: 0, y: 0),
                end: CGPoint(x: size.width, y: size.height),
                options: []
            )
            
            // Draw emotion text instead of emoji for better accessibility
            let emotionText = emotion.capitalized
            let fontSize: CGFloat = 48
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: fontSize),
                .foregroundColor: UIColor.white,
                .strokeColor: UIColor.black,
                .strokeWidth: -2
            ]
            
            let attributedString = NSAttributedString(string: emotionText, attributes: attributes)
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
                imageName: "fallback_\(emotion)_\(variation)",
                correctEmotion: emotion,
                difficulty: variation,
                imageData: imageData
            )
        }
        
        return nil
    }
    
    private func getGradientForEmotion(_ emotion: String, variation: Int) -> CGGradient {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        var colors: [CGColor] = []
        
        switch emotion.lowercased() {
        case "happy":
            colors = [UIColor.systemYellow.cgColor, UIColor.systemOrange.cgColor]
        case "sad":
            colors = [UIColor.systemBlue.cgColor, UIColor.systemTeal.cgColor]
        case "angry":
            colors = [UIColor.systemRed.cgColor, UIColor.systemPink.cgColor]
        case "surprised":
            colors = [UIColor.systemOrange.cgColor, UIColor.systemYellow.cgColor]
        case "fear":
            colors = [UIColor.systemPurple.cgColor, UIColor.systemIndigo.cgColor]
        case "neutral":
            colors = [UIColor.systemGray.cgColor, UIColor.systemGray2.cgColor]
        default:
            colors = [UIColor.systemGray.cgColor, UIColor.systemGray2.cgColor]
        }
        
        return CGGradient(colorsSpace: colorSpace, colors: colors as CFArray, locations: nil)!
    }
    
    // MARK: - Public Interface
    func getAllQuestions(preferredSource: ImageSource = .localDataset) async throws -> [GameQuestion] {
        let emotions = ["happy", "sad", "angry", "surprised", "fear", "neutral"]
        var allQuestions: [GameQuestion] = []
        
        for emotion in emotions {
            let questions = try await loadImagesForEmotion(emotion, source: preferredSource, count: 2)
            allQuestions.append(contentsOf: questions)
        }
        
        return allQuestions.shuffled()
    }
    
    func switchToGeneratedImages() {
        // Clear local cache and switch to AI generation
        generatedImages.removeAll()
        cacheManager.clearCache()
    }
    
    func uploadSafePersonReference(_ imageData: Data) {
        UserDefaults.standard.set(imageData, forKey: "safe_person_reference")
        print("Safe person reference uploaded for custom emotion generation")
    }
}

// MARK: - Image Cache Manager
class ImageCacheManager {
    private let cacheDirectory: URL
    
    init() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        cacheDirectory = documentsPath.appendingPathComponent("ImageCache")
        
        // Create cache directory if it doesn't exist
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    func saveToCache(images: [Data], for emotion: String) {
        for (index, imageData) in images.enumerated() {
            let fileName = "\(emotion)_\(index).png"
            let fileURL = cacheDirectory.appendingPathComponent(fileName)
            try? imageData.write(to: fileURL)
        }
    }
    
    func loadFromCache(emotion: String, count: Int) -> [Data] {
        var images: [Data] = []
        
        for i in 0..<count {
            let fileName = "\(emotion)_\(i).png"
            let fileURL = cacheDirectory.appendingPathComponent(fileName)
            if let imageData = try? Data(contentsOf: fileURL) {
                images.append(imageData)
            }
        }
        
        return images
    }
    
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
}

// MARK: - Error Types
enum ImageGenerationError: Error {
    case noSafePersonReference
    case generationFailed
    case cacheError
}

// MARK: - Image Quality Settings
extension ImageGenerationService {
    enum ImageQuality {
        case fast      // Lower quality, faster generation, cheaper
        case standard  // Balanced quality and speed
        case premium   // High quality, slower, more expensive
        
        var openAIQuality: String {
            switch self {
            case .fast: return "standard"
            case .standard: return "standard"
            case .premium: return "hd"
            }
        }
        
        var imageSize: String {
            switch self {
            case .fast: return "512x512"
            case .standard: return "1024x1024"
            case .premium: return "1024x1024"
            }
        }
    }
}