import SwiftUI
import AVFoundation

struct VisionTrainingView: View {
    @StateObject private var userMonitoringService = UserMonitoringService.shared
    @StateObject private var cameraManager = CameraManager()
    @Environment(\.dismiss) private var dismiss
    
    @State private var detectedEmotion = "Neutral"
    @State private var confidence: Float = 0.0
    @State private var targetEmotion = "Happy"
    @State private var isTraining = false
    @State private var score = 0
    @State private var feedback = ""
    @State private var showingPermissionAlert = false
    
    private let emotions = ["Happy", "Sad", "Angry", "Surprised", "Fear", "Neutral"]
    
    var body: some View {
        ZStack {
            // Camera preview background
            CameraView(cameraManager: cameraManager)
                .ignoresSafeArea()
            
            // Overlay UI
            VStack(spacing: 20) {
                // Header
                HStack {
                    Text("Vision Training")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.5), radius: 2)
                    
                    Spacer()
                    
                    Button("Exit") {
                        stopTraining()
                        dismiss()
                    }
                    .foregroundColor(.red)
                    .fontWeight(.bold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.9))
                    .clipShape(Capsule())
                }
                .padding()
                
                Spacer()
                
                // Center detection area
                VStack(spacing: 15) {
                    // Target emotion
                    VStack(spacing: 8) {
                        Text("Try to show:")
                            .font(.headline)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.5), radius: 2)
                        
                        Text(targetEmotion)
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.yellow)
                            .shadow(color: .black.opacity(0.7), radius: 3)
                            .padding()
                            .background(Color.black.opacity(0.6))
                            .clipShape(RoundedRectangle(cornerRadius: 15))
                    }
                    
                    // Detection results
                    VStack(spacing: 8) {
                        Text("I see:")
                            .font(.title3)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.5), radius: 2)
                        
                        HStack(spacing: 15) {
                            Text(detectedEmotion)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(detectedEmotion == targetEmotion ? .green : .orange)
                                .shadow(color: .black.opacity(0.7), radius: 2)
                            
                            Text("\(Int(confidence * 100))%")
                                .font(.title3)
                                .foregroundColor(.white)
                                .shadow(color: .black.opacity(0.5), radius: 2)
                        }
                        .padding()
                        .background(Color.black.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Confidence bar
                    ProgressView(value: confidence, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: confidence > 0.7 ? .green : .orange))
                        .frame(height: 8)
                        .background(Color.white.opacity(0.3))
                        .clipShape(Capsule())
                        .padding(.horizontal, 20)
                }
                
                Spacer()
                
                // Bottom controls
                VStack(spacing: 15) {
                    // Feedback message
                    if !feedback.isEmpty {
                        Text(feedback)
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.green.opacity(0.8))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: .black.opacity(0.3), radius: 2)
                    }
                    
                    // Score and controls
                    HStack(spacing: 20) {
                        // Score
                        VStack {
                            Text("Score")
                                .font(.caption)
                                .foregroundColor(.white)
                            Text("\(score)")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.yellow)
                        }
                        .padding()
                        .background(Color.black.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        
                        Spacer()
                        
                        // Training controls
                        Button(action: {
                            if isTraining {
                                stopTraining()
                            } else {
                                startTraining()
                            }
                        }) {
                            Text(isTraining ? "Stop Training" : "Start Training")
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(isTraining ? Color.red : Color.blue)
                                .clipShape(Capsule())
                        }
                        
                        Button("Next Emotion") {
                            nextTargetEmotion()
                        }
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(Color.purple)
                        .clipShape(Capsule())
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 30)
            }
        }
        .navigationBarHidden(true)
        .alert("Camera Permission Required", isPresented: $showingPermissionAlert) {
            Button("Settings") {
                if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(settingsURL)
                }
            }
            Button("Cancel") {}
        } message: {
            Text("Please allow camera access to use vision training features.")
        }
        .onAppear {
            requestPermissions()
        }
        .onChange(of: userMonitoringService.currentEmotionalState) { oldValue, newValue in
            if let emotion = newValue?.primary {
                updateDetection(emotion: String(describing: emotion), confidence: Float(newValue?.confidence ?? 0.0))
            }
        }
    }
    
    private func requestPermissions() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupCamera()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    if granted {
                        setupCamera()
                    } else {
                        showingPermissionAlert = true
                    }
                }
            }
        default:
            showingPermissionAlert = true
        }
    }
    
    private func setupCamera() {
        cameraManager.checkPermissionAndStart()
    }
    
    private func startTraining() {
        isTraining = true
        feedback = ""
        
        Task {
            do {
                try await userMonitoringService.startMonitoring()
            } catch {
                DispatchQueue.main.async {
                    feedback = "Error starting monitoring: \(error.localizedDescription)"
                    isTraining = false
                }
            }
        }
    }
    
    private func stopTraining() {
        isTraining = false
        userMonitoringService.stopMonitoring()
        feedback = ""
    }
    
    private func updateDetection(emotion: String, confidence: Float) {
        detectedEmotion = emotion
        self.confidence = confidence
        
        if isTraining && emotion.lowercased() == targetEmotion.lowercased() && confidence > 0.7 {
            // Successful match!
            score += 10
            feedback = "Great job! Perfect \(targetEmotion)!"
            
            // Auto advance after success
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                nextTargetEmotion()
                feedback = ""
            }
        }
    }
    
    private func nextTargetEmotion() {
        let currentIndex = emotions.firstIndex(of: targetEmotion) ?? 0
        let nextIndex = (currentIndex + 1) % emotions.count
        targetEmotion = emotions[nextIndex]
        feedback = ""
    }
}

// CameraPreviewView is now handled by CameraUI.swift to avoid duplication

#Preview {
    VisionTrainingView()
}