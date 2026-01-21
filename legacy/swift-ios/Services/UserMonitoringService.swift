import Foundation
import AVFoundation
import UIKit
import Vision

// MARK: - User Facial Expression Monitoring Service
class UserMonitoringService: NSObject, ObservableObject {
    static let shared = UserMonitoringService()
    
    @Published var currentEmotionalState: EmotionalState?
    @Published var isMonitoring = false
    @Published var monitoringStats: MonitoringStats = MonitoringStats()
    
    private var captureSession: AVCaptureSession?
    private var videoOutput: AVCaptureVideoDataOutput?
    private let openAIService = OpenAIService.shared
    
    private let processingQueue = DispatchQueue(label: "emotion_monitoring", qos: .userInitiated)
    private var lastProcessTime: Date = Date()
    private let processingInterval: TimeInterval = 2.0 // Process every 2 seconds to manage API costs
    
    // MARK: - Monitoring Control
    func startMonitoring() async throws {
        guard !isMonitoring else { return }
        
        // Request camera permission
        let cameraPermission = await requestCameraPermission()
        guard cameraPermission else {
            throw MonitoringError.cameraPermissionDenied
        }
        
        try setupCaptureSession()
        captureSession?.startRunning()
        
        await MainActor.run {
            isMonitoring = true
        }
    }
    
    func stopMonitoring() {
        captureSession?.stopRunning()
        isMonitoring = false
    }
    
    func pauseMonitoring() {
        captureSession?.stopRunning()
    }
    
    func resumeMonitoring() {
        captureSession?.startRunning()
    }
    
    // MARK: - Camera Setup
    private func setupCaptureSession() throws {
        captureSession = AVCaptureSession()
        captureSession?.sessionPreset = .medium
        
        // Add camera input
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            throw MonitoringError.cameraSetupFailed
        }
        
        if captureSession?.canAddInput(input) == true {
            captureSession?.addInput(input)
        }
        
        // Add video output
        videoOutput = AVCaptureVideoDataOutput()
        videoOutput?.setSampleBufferDelegate(self, queue: processingQueue)
        
        if let videoOutput = videoOutput,
           captureSession?.canAddOutput(videoOutput) == true {
            captureSession?.addOutput(videoOutput)
        }
    }
    
    private func requestCameraPermission() async -> Bool {
        return await withCheckedContinuation { continuation in
            AVCaptureDevice.requestAccess(for: .video) { granted in
                continuation.resume(returning: granted)
            }
        }
    }
    
    // MARK: - Emotion Analysis
    private func analyzeEmotion(from imageBuffer: CVImageBuffer) async {
        // Rate limiting to manage API costs
        let now = Date()
        guard now.timeIntervalSince(lastProcessTime) >= processingInterval else { return }
        lastProcessTime = now
        
        do {
            // Convert buffer to image data
            let ciImage = CIImage(cvImageBuffer: imageBuffer)
            let context = CIContext()
            guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return }
            
            let uiImage = UIImage(cgImage: cgImage)
            guard let imageData = uiImage.jpegData(compressionQuality: 0.7) else { return }
            
            // Analyze with OpenAI Vision API
            let result = try await openAIService.recognizeEmotion(in: imageData)
            
            await MainActor.run {
                updateEmotionalState(from: result)
                updateMonitoringStats(result)
            }
            
        } catch {
            print("Error analyzing emotion: \(error)")
        }
    }
    
    private func updateEmotionalState(from result: EmotionRecognitionResult) {
        let emotion = mapStringToEmotion(result.emotion)
        
        currentEmotionalState = EmotionalState(
            primary: emotion,
            intensity: result.confidence,
            confidence: result.confidence
        )
    }
    
    private func updateMonitoringStats(_ result: EmotionRecognitionResult) {
        monitoringStats.totalReadings += 1
        
        // Track emotion distribution
        let emotion = result.emotion
        monitoringStats.emotionDistribution[emotion] = (monitoringStats.emotionDistribution[emotion] ?? 0) + 1
        
        // Track confidence levels
        if result.confidence > 0.8 {
            monitoringStats.highConfidenceReadings += 1
        }
        
        // Detect engagement patterns
        if ["happy", "surprised", "neutral"].contains(emotion) {
            monitoringStats.engagementScore += 0.1
        } else if ["sad", "angry", "fear"].contains(emotion) {
            monitoringStats.engagementScore = max(0, monitoringStats.engagementScore - 0.1)
        }
        
        monitoringStats.engagementScore = min(1.0, max(0.0, monitoringStats.engagementScore))
    }
    
    private func mapStringToEmotion(_ emotionString: String) -> EmotionalState.Emotion {
        switch emotionString.lowercased() {
        case "happy":
            return .happy
        case "sad":
            return .sad
        case "angry":
            return .angry
        case "surprised":
            return .surprised
        case "fear":
            return .fear
        case "neutral":
            return .neutral
        default:
            return .neutral
        }
    }
    
    // MARK: - Engagement Analysis
    func getEngagementLevel() -> EngagementLevel {
        if monitoringStats.engagementScore > 0.7 {
            return .high
        } else if monitoringStats.engagementScore > 0.4 {
            return .moderate
        } else {
            return .low
        }
    }
    
    func getFrustrrationLevel() -> FrustrationLevel {
        let negativeEmotions = ["angry", "sad", "fear"]
        let negativeCount = negativeEmotions.reduce(0) { count, emotion in
            count + (monitoringStats.emotionDistribution[emotion] ?? 0)
        }
        
        let frustrationRatio = Double(negativeCount) / Double(monitoringStats.totalReadings)
        
        if frustrationRatio > 0.6 {
            return .high
        } else if frustrationRatio > 0.3 {
            return .moderate
        } else {
            return .low
        }
    }
    
    func getRecommendedAction() -> RecommendedAction {
        let engagement = getEngagementLevel()
        let frustration = getFrustrrationLevel()
        
        switch (engagement, frustration) {
        case (.low, .high):
            return .takeBreak
        case (.low, .moderate):
            return .changeActivity
        case (.moderate, .high):
            return .provideEncouragement
        case (.high, .low):
            return .continueActivity
        case (.high, .moderate):
            return .adjustDifficulty
        default:
            return .monitor
        }
    }
    
    // MARK: - Data Export for Therapists
    func generateMonitoringReport() -> MonitoringReport {
        return MonitoringReport(
            sessionDuration: Date().timeIntervalSince(monitoringStats.sessionStartTime),
            totalReadings: monitoringStats.totalReadings,
            emotionDistribution: monitoringStats.emotionDistribution,
            averageEngagement: monitoringStats.engagementScore,
            frustrationEvents: identifyFrustrationEvents(),
            recommendations: generateRecommendations()
        )
    }
    
    private func identifyFrustrationEvents() -> [FrustrationEvent] {
        // TODO: Analyze patterns to identify specific frustration events
        return []
    }
    
    private func generateRecommendations() -> [String] {
        var recommendations: [String] = []
        
        if getEngagementLevel() == .low {
            recommendations.append("Consider shorter sessions or more interactive activities")
        }
        
        if getFrustrrationLevel() == .high {
            recommendations.append("Reduce difficulty level and provide more positive reinforcement")
        }
        
        let dominantEmotion = monitoringStats.emotionDistribution.max { $0.value < $1.value }?.key ?? "neutral"
        if dominantEmotion == "confused" {
            recommendations.append("Provide clearer instructions and visual cues")
        }
        
        return recommendations
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate
extension UserMonitoringService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        Task {
            await analyzeEmotion(from: imageBuffer)
        }
    }
}

// MARK: - Data Models
struct MonitoringStats {
    var sessionStartTime = Date()
    var totalReadings = 0
    var highConfidenceReadings = 0
    var emotionDistribution: [String: Int] = [:]
    var engagementScore: Double = 0.5
}

struct MonitoringReport {
    let sessionDuration: TimeInterval
    let totalReadings: Int
    let emotionDistribution: [String: Int]
    let averageEngagement: Double
    let frustrationEvents: [FrustrationEvent]
    let recommendations: [String]
}

struct FrustrationEvent {
    let timestamp: Date
    let emotion: String
    let confidence: Double
    let duration: TimeInterval
}

enum MonitoringError: Error {
    case cameraPermissionDenied
    case cameraSetupFailed
    case processingError
}

enum EngagementLevel {
    case low, moderate, high
}

enum FrustrationLevel {
    case low, moderate, high
}

enum RecommendedAction {
    case continueActivity
    case adjustDifficulty
    case changeActivity
    case provideEncouragement
    case takeBreak
    case monitor
}

// MARK: - Privacy and Data Protection
extension UserMonitoringService {
    func enablePrivacyMode() {
        // Process emotions locally without sending images to API
        // Use reduced frequency monitoring
    }
    
    func clearMonitoringData() {
        monitoringStats = MonitoringStats()
        currentEmotionalState = nil
    }
    
    func exportDataForTherapist() -> String {
        let report = generateMonitoringReport()
        // Convert to JSON or formatted string for therapist review
        return formatReportForExport(report)
    }
    
    private func formatReportForExport(_ report: MonitoringReport) -> String {
        // TODO: Format report in therapist-friendly format
        return "Monitoring Report - \(Date())"
    }
}