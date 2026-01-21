//
//  FacePipeline.swift
//  AURA
//
//  Runs Vision face detection on camera frames and calls OpenAI Vision
//  to publish the current expression + confidence
//

import Vision
import Combine
import AVFoundation
import UIKit

final class FacePipeline: NSObject, ObservableObject {

    // ───────── UI-observable state ─────────
    @Published var label: String = "neutral"
    @Published var confidence: Double = 1.0

    // ───────── Callback for external use ─────────
    var onEmotionDetected: ((String, Double) -> Void)?

    // ───────── Private helpers ─────────
    private let handler = VNSequenceRequestHandler()
    private let visionQ = DispatchQueue(label: "vision.q", qos: .userInitiated)
    private let faceReq = VNDetectFaceRectanglesRequest()
    private let ciContext = CIContext()
    private let openAIService = OpenAIService.shared
    private let inferenceInterval: TimeInterval = 1.5
    private var lastInference: Date = .distantPast
    private weak var cameraManager: CameraManager?

    // ───────── Called for **every** frame from CameraManager ─────────
    func process(sampleBuffer sb: CMSampleBuffer,
                 orientation exif: CGImagePropertyOrientation) {
        visionQ.async { [weak self] in
            guard let self,
                  let pixelBuffer = CMSampleBufferGetImageBuffer(sb) else { return }

            let faceHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: exif)
            do {
                try faceHandler.perform([self.faceReq])
            } catch {
                print("❌ face detection error: \(error)")
                self.publishNeutral()
                return
            }

            guard let face = self.faceReq.results?.first as? VNFaceObservation else {
                self.publishNeutral()
                return
            }

            guard let faceData = self.extractFaceData(from: pixelBuffer, face: face) else {
                self.publishNeutral()
                return
            }

            guard Date().timeIntervalSince(self.lastInference) >= self.inferenceInterval else { return }
            self.lastInference = Date()

            Task {
                do {
                    let result = try await self.openAIService.recognizeEmotion(in: faceData)
                    await MainActor.run {
                        self.label = result.emotion
                        self.confidence = result.confidence
                        self.onEmotionDetected?(result.emotion, result.confidence)
                    }
                } catch {
                    print("❌ emotion recognition error: \(error)")
                    await self.publishNeutral()
                }
            }
        }
    }

    func startDetection(cameraManager: CameraManager) {
        self.cameraManager = cameraManager
        cameraManager.onFrameProcessed = { [weak self] sampleBuffer, orientation in
            self?.process(sampleBuffer: sampleBuffer, orientation: orientation)
        }
    }

    func stopDetection() {
        cameraManager?.onFrameProcessed = nil
        cameraManager = nil
    }

    private func extractFaceData(from pixelBuffer: CVPixelBuffer, face: VNFaceObservation) -> Data? {
        let ciImage = CIImage(cvImageBuffer: pixelBuffer)
        let width = CGFloat(CVPixelBufferGetWidth(pixelBuffer))
        let height = CGFloat(CVPixelBufferGetHeight(pixelBuffer))

        let boundingBox = face.boundingBox
        let cropRect = CGRect(
            x: boundingBox.origin.x * width,
            y: (1 - boundingBox.origin.y - boundingBox.height) * height,
            width: boundingBox.width * width,
            height: boundingBox.height * height
        ).integral

        guard cropRect.width > 0, cropRect.height > 0,
              let cgImage = ciContext.createCGImage(ciImage, from: CGRect(origin: .zero, size: CGSize(width: width, height: height))),
              let cropped = cgImage.cropping(to: cropRect) else {
            return nil
        }

        let faceImage = UIImage(cgImage: cropped)
        return faceImage.jpegData(compressionQuality: 0.75)
    }

    @MainActor
    private func publishNeutral() {
        label = "neutral"
        confidence = 1.0
        onEmotionDetected?("neutral", 1.0)
    }
}
