//
//  CameraUI.swift
//  AutismTrainerApp
//
//  **Only** preview-layer code lives here now.
//  Make sure *no other file* defines `CameraPreviewView` or `CameraView`.
//

import AVFoundation
import SwiftUI

// ───── UIView that owns one AVCaptureVideoPreviewLayer ────────────────────
final class CameraPreviewView: UIView {
    var previewLayer: AVCaptureVideoPreviewLayer?

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }
}

// ───── SwiftUI wrapper ────────────────────────────────────────────────────
struct CameraView: UIViewRepresentable {
    typealias UIViewType = CameraPreviewView
    
    let cameraManager: CameraManager          // running manager injected

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> CameraPreviewView {
        let view = CameraPreviewView()
        context.coordinator.installPreviewLayer(into: view,
                                                session: cameraManager.session)
        return view
    }

    func updateUIView(_ uiView: CameraPreviewView, context: Context) { }

    // One-time helper
    final class Coordinator {
        private var layer: AVCaptureVideoPreviewLayer?

        func installPreviewLayer(into view: CameraPreviewView,
                                 session: AVCaptureSession) {
            guard layer == nil else { return }                 // only once
            let l = AVCaptureVideoPreviewLayer(session: session)
            l.videoGravity = .resizeAspectFill
            view.layer.addSublayer(l)
            view.previewLayer = l
            layer = l
        }
    }
}
