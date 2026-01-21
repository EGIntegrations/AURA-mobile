import SwiftUI

/// A reusable button style that renders a glassmorphic capsule/button.
struct GlassButton<Label: View>: View {
    enum Style {
        case primary
        case secondary
        case danger
    }

    private let style: Style
    private let action: () -> Void
    private let label: () -> Label

    init(style: Style = .primary, action: @escaping () -> Void, @ViewBuilder label: @escaping () -> Label) {
        self.style = style
        self.action = action
        self.label = label
    }

    var body: some View {
        Button(action: action) {
            label()
                .font(.headline)
                .foregroundStyle(foreground)
                .padding(.horizontal, 22)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 22, style: .continuous)
                                .stroke(border, lineWidth: 1.2)
                        )
                )
                .shadow(color: shadow, radius: 12, x: 0, y: 6)
        }
        .buttonStyle(.plain)
    }

    private var foreground: LinearGradient {
        switch style {
        case .primary:
            return LinearGradient(colors: [Color.white, Color.white.opacity(0.8)], startPoint: .top, endPoint: .bottom)
        case .secondary:
            return LinearGradient(colors: [Color.white.opacity(0.9), Color.white.opacity(0.7)], startPoint: .top, endPoint: .bottom)
        case .danger:
            return LinearGradient(colors: [Color.white, Color.white.opacity(0.85)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private var border: LinearGradient {
        switch style {
        case .primary:
            return LinearGradient(colors: [.white.opacity(0.55), .blue.opacity(0.45)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .secondary:
            return LinearGradient(colors: [.white.opacity(0.45), .purple.opacity(0.35)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .danger:
            return LinearGradient(colors: [.white.opacity(0.45), .red.opacity(0.45)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private var shadow: Color {
        switch style {
        case .primary: return Color.blue.opacity(0.25)
        case .secondary: return Color.purple.opacity(0.25)
        case .danger: return Color.red.opacity(0.3)
        }
    }
}
