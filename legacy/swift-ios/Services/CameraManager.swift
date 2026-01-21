//
//  CameraManager.swift
//

import AVFoundation
import SwiftUI

/// Runs an AVCaptureSession on a background queue and delivers each frame
/// (plus EXIF orientation) back to the UI.
final class CameraManager: NSObject,
                           ObservableObject,
                           AVCaptureVideoDataOutputSampleBufferDelegate {

    // ── UI state – must be touched on the main actor ──────────────────────
    @MainActor @Published var permissionDenied = false
    @MainActor @Published var isAuthorized = false

    // ── Capture infra (touch *only* on `queue`) ───────────────────────────
    let session       = AVCaptureSession()
    private let queue = DispatchQueue(label: "camera.session.queue",
                                      qos: .userInitiated)
    private var isRunning = false

    /// Called for every frame.
    var frameHandler: (@Sendable (CMSampleBuffer,
                                  CGImagePropertyOrientation) -> Void)?
    
    /// Alternative callback for processed frames
    var onFrameProcessed: ((CMSampleBuffer, CGImagePropertyOrientation) -> Void)?

    // ── Permissions / lifecycle ───────────────────────────────────────────
    @MainActor
    func checkPermissionAndStart() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:        
            isAuthorized = true
            configureAndRun()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                Task { @MainActor in
                    self?.permissionDenied = !granted
                    self?.isAuthorized = granted
                    if granted { self?.configureAndRun() }
                }
            }
        default: 
            permissionDenied = true
            isAuthorized = false
        }
    }

    func stop() {
        queue.async { [self] in
            if isRunning { session.stopRunning(); isRunning = false }
        }
    }
    deinit { stop() }

    // ── Private helpers ───────────────────────────────────────────────────
    private func configureAndRun() {
        queue.async { [self] in
            session.beginConfiguration()
            session.sessionPreset = .medium

            guard
                let cam   = AVCaptureDevice.default(.builtInWideAngleCamera,
                                                    for: .video,
                                                    position: .front),
                let input = try? AVCaptureDeviceInput(device: cam),
                session.canAddInput(input)
            else { session.commitConfiguration(); return }

            session.addInput(input)

            let output = AVCaptureVideoDataOutput()
            output.setSampleBufferDelegate(self, queue: queue)
            output.videoSettings = [
                kCVPixelBufferPixelFormatTypeKey as String:
                kCVPixelFormatType_32BGRA
            ]
            session.addOutput(output)
            session.commitConfiguration()

            if !isRunning { session.startRunning(); isRunning = true }
        }
    }

    // ── Delegate – one call per video frame ───────────────────────────────
    func captureOutput(_ output: AVCaptureOutput,
                       didOutput sb: CMSampleBuffer,
                       from connection: AVCaptureConnection) {

        // Use videoRotationAngle instead of deprecated videoOrientation for iOS 17+
        let exif: CGImagePropertyOrientation
        if #available(iOS 17.0, *) {
            exif = CGImagePropertyOrientation(connection.videoRotationAngle)
        } else {
            exif = CGImagePropertyOrientation(connection.videoOrientation)
        }
        frameHandler?(sb, exif)
        onFrameProcessed?(sb, exif)
    }
    
    // ── Public methods for external use ───────────────────────────────────
    func checkPermissions(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            Task { @MainActor in
                self.isAuthorized = true
            }
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                Task { @MainActor in
                    self.isAuthorized = granted
                }
                completion(granted)
            }
        default:
            Task { @MainActor in
                self.isAuthorized = false
            }
            completion(false)
        }
    }
    
    func startSession() {
        queue.async { [self] in
            if !isRunning {
                session.startRunning()
                isRunning = true
            }
        }
    }
    
    func stopSession() {
        queue.async { [self] in
            if isRunning {
                session.stopRunning()
                isRunning = false
            }
        }
    }
}

// ── Helper to convert AVCapture → EXIF orientation ────────────────────────
private extension CGImagePropertyOrientation {
    init(_ v: AVCaptureVideoOrientation) {
        switch v {
        case .portrait:           self = .right
        case .portraitUpsideDown: self = .left
        case .landscapeRight:     self = .up
        case .landscapeLeft:      self = .down
        @unknown default:         self = .right
        }
    }
    
    // iOS 17+ support for videoRotationAngle
    @available(iOS 17.0, *)
    init(_ angle: Double) {
        switch angle {
        case 0:   self = .up
        case 90:  self = .right
        case 180: self = .down
        case 270: self = .left
        default:  self = .right
        }
    }
}
