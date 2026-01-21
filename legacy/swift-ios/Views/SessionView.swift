import SwiftUI

struct SessionView: View {
    @StateObject private var cam  = CameraManager()
    @StateObject private var pipe = FacePipeline()
    private let talker = TherapyLLM()

    var body: some View {
        ZStack(alignment: .topLeading) {
            CameraView(cameraManager: cam)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 6) {
                Text("Expression: \(pipe.label)")
                Text(String(format: "Confidence: %.0f %%", pipe.confidence * 100))
            }
            .font(.headline)
            .padding(12)
            .background(.ultraThinMaterial, in: .rect(cornerRadius: 12))
            .padding()
        }
        .onAppear {
            cam.frameHandler = pipe.process   // wire Vision
            cam.checkPermissionAndStart()
        }
        .task(id: pipe.label) { await talker.respond(to: pipe.label) }
    }
}
