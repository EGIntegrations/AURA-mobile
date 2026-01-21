import SwiftUI

/// Animated gradient backdrop that mirrors the login glass aesthetic.
struct AuraBackground: View {
    var body: some View {
        TimelineView(.animation) { context in
            let t = context.date.timeIntervalSince1970
            let shiftX = sin(t / 8) * 120
            let shiftY = cos(t / 6) * 90

            ZStack {
                LinearGradient(
                    colors: [Color(hex: 0x0C1B33), Color(hex: 0x15294B), Color(hex: 0x0A1424)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                Group {
                    RadialGradient(
                        colors: [Color(hex: 0x5EA8FF).opacity(0.55), .clear],
                        center: .init(x: 0.2 + sin(t / 5) * 0.1, y: 0.25),
                        startRadius: 60,
                        endRadius: 520
                    )
                    RadialGradient(
                        colors: [Color(hex: 0xA855F7).opacity(0.5), .clear],
                        center: .init(x: 0.85, y: 0.2 + cos(t / 4) * 0.08),
                        startRadius: 90,
                        endRadius: 540
                    )
                    RadialGradient(
                        colors: [Color(hex: 0x22D3EE).opacity(0.45), .clear],
                        center: .init(x: 0.5 + sin(t / 3) * 0.12, y: 0.9),
                        startRadius: 70,
                        endRadius: 620
                    )
                }
                .blur(radius: 140)

                Circle()
                    .fill(.white.opacity(0.08))
                    .frame(width: 420, height: 420)
                    .offset(x: shiftX, y: -260)

                Circle()
                    .fill(.white.opacity(0.06))
                    .frame(width: 360, height: 360)
                    .offset(x: -shiftX * 0.6, y: 220 + shiftY * 0.15)

                Circle()
                    .fill(.white.opacity(0.05))
                    .frame(width: 500, height: 500)
                    .offset(x: shiftX * 0.3, y: 40 + shiftY * 0.2)
            }
            .ignoresSafeArea()
        }
        .drawingGroup()
    }
}

private extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
