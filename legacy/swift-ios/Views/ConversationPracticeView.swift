import SwiftUI
import AVFoundation

struct ConversationPracticeView: View {
    @EnvironmentObject private var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss

    @StateObject private var conversationService = ConversationService.shared
    @StateObject private var elevenLabsService = ElevenLabsService.shared

    @State private var messageText = ""
    @State private var isListening = false
    @State private var isProcessing = false
    @State private var hasFinalized = false
    @State private var conversationStart = Date()

    @State private var currentScenario = ScenarioPalette.socialGreeting
    @Namespace private var scenarioNamespace

    private var availableScenarios: [ScenarioPalette] { ScenarioPalette.allCases }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                AuraBackground()
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        header
                        conversationTranscript
                        quickResponses
                        footerStats
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 28)
                    // .padding(.bottom, 160) ← REMOVED: Conflicts with safeAreaInset below
                }
                .safeAreaPadding(.top, 12)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                inputBar
                    .padding(.horizontal, 24)
                    .padding(.vertical, 18)
                    .background(.ultraThinMaterial)
            }
            .ignoresSafeArea(.keyboard, edges: .bottom) // ← ADDED: Prevents keyboard from hiding input
            .navigationBarHidden(true)
        }
        .onAppear { startConversation(with: currentScenario.scenario) }
        .onDisappear { finishConversation() }
        .onChange(of: currentScenario) { _, newValue in
            restartConversation(with: newValue.scenario)
        }
        .onReceive(conversationService.$isListening) { listen in
            isListening = listen
        }
        .onReceive(conversationService.$isProcessing) { processing in
            isProcessing = processing
        }
    }
}

// MARK: - Layout Sections
private extension ConversationPracticeView {
    var header: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Conversation Practice")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.white)
                        Text("Build social confidence through guided chat scenarios")
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    Spacer()
                    GlassButton(style: .secondary) {
                        finishConversation()
                        dismiss()
                    } label: {
                        Label("Exit", systemImage: "xmark")
                    }
                    .controlSize(.small)
                }

                scenarioSelector
            }
        }
    }

    var scenarioSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(availableScenarios) { palette in
                    scenarioChip(for: palette)
                }
            }
            .padding(.vertical, 6)
        }
    }

    func scenarioChip(for palette: ScenarioPalette) -> some View {
        let isSelected = currentScenario == palette
        return Button {
            currentScenario = palette
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Image(systemName: palette.icon)
                    Text(palette.title)
                        .fontWeight(.semibold)
                }
                Text(palette.subtitle)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
                CapabilityBadge(level: palette.scenario.difficulty)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(minWidth: 180, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(LinearGradient(colors: palette.colors.map { $0.opacity(isSelected ? 0.65 : 0.35) }, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Color.white.opacity(isSelected ? 0.4 : 0.2), lineWidth: 1)
                    )
            )
            .matchedGeometryEffect(id: palette.id, in: scenarioNamespace)
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
    }

    var conversationTranscript: some View {
        GlassCard(cornerRadius: 26, padding: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(conversationService.conversationHistory) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                                .padding(.horizontal, 18)
                        }

                        if isProcessing {
                            TypingIndicator()
                                .padding(.horizontal, 18)
                        }
                    }
                    .padding(.vertical, 22)
                }
                .frame(height: 400) // ← ADDED: Fixed height prevents nested scroll conflicts
                .background(
                    RoundedRectangle(cornerRadius: 26, style: .continuous)
                        .fill(Color.white.opacity(0.04))
                )
                .onChange(of: conversationService.conversationHistory.count) { _, _ in
                    guard let last = conversationService.conversationHistory.last else { return }
                    withAnimation(.easeInOut(duration: 0.3)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    var quickResponses: some View {
        GlassCard(padding: 16) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Quick prompts", systemImage: "sparkles")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Spacer()
                    Text("Tap to respond or adapt")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.65))
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(currentScenario.quickResponses, id: \.self) { response in
                            GlassButton(style: .secondary) {
                                sendMessage(response)
                            } label: {
                                Text(response)
                                    .font(.subheadline)
                                    .padding(.horizontal, 6)
                            }
                            .controlSize(.small)
                        }
                    }
                }
            }
        }
    }

    var inputBar: some View {
        GlassCard(padding: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Write or speak your response")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))

                HStack(spacing: 12) {
                    TextField("Type your message…", text: $messageText)
                        .textFieldStyle(.plain)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.white.opacity(0.07))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .stroke(Color.white.opacity(0.18), lineWidth: 1)
                                )
                        )

                    GlassButton(style: .primary) {
                        let trimmed = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !trimmed.isEmpty else { return }
                        sendMessage(trimmed)
                        messageText = ""
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.title3)
                    }
                    .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    GlassButton(style: isListening ? .danger : .primary) {
                        toggleListening()
                    } label: {
                        Image(systemName: isListening ? "mic.fill" : "mic")
                            .font(.title3)
                            .symbolEffect(.bounce, value: isListening)
                    }
                }
            }
        }
    }

    var footerStats: some View {
        GlassCard(cornerRadius: 28, padding: 0) {
            HStack(spacing: 20) {
                FooterMetric(icon: "clock", title: "Duration", value: formattedDuration)
                Divider().overlay(Color.white.opacity(0.18))
                FooterMetric(icon: "hand.thumbsup", title: "Positivity", value: positivityScore)
                Divider().overlay(Color.white.opacity(0.18))
                FooterMetric(icon: "star", title: "Progress", value: currentScenario.goalKeyword)
            }
            .padding(.vertical, 16)
        }
    }
}

// MARK: - Interaction
private extension ConversationPracticeView {
    func startConversation(with scenario: ConversationScenario) {
        messageText = ""
        isProcessing = false
        conversationStart = Date()
        hasFinalized = false
        conversationService.conversationHistory.removeAll()

        Task {
            do {
                try await conversationService.startConversation(
                    scenario: scenario,
                    userLevel: UserLevel(level: authManager.currentProgress.currentLevel, description: "User level")
                )
                if let welcome = conversationService.conversationHistory.last?.content {
                    try await elevenLabsService.playConversationResponse(welcome, tone: .supportive)
                }
            } catch {
                await MainActor.run {
                    appendSystemMessage("I'm having trouble starting right now. Let's try again in a moment.")
                }
            }
        }
    }

    func restartConversation(with scenario: ConversationScenario) {
        finishConversation()
        startConversation(with: scenario)
    }

    func sendMessage(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isProcessing = true

        Task {
            _ = await conversationService.processUserMessage(trimmed)
            await MainActor.run { isProcessing = false }
        }
    }

    func toggleListening() {
        if isListening {
            conversationService.stopListening()
        } else {
            Task {
                do {
                    try await conversationService.startListening()
                } catch {
                    await MainActor.run {
                        appendSystemMessage("I couldn't access the microphone. Check permissions and try again.")
                    }
                }
            }
        }
    }

    func finishConversation() {
        guard !hasFinalized else { return }
        hasFinalized = true
        conversationService.endConversation()

        Task {
            var summaryText: String?
            for _ in 0..<6 {
                try? await Task.sleep(nanoseconds: 400_000_000)
                if let summary = conversationService.currentConversation?.summary, !summary.isEmpty {
                    summaryText = summary
                    break
                }
            }

            let highlights = summaryText ?? fallbackHighlight()
            let recommendations = "Practice \(currentScenario.title.lowercased()) again and focus on \(currentScenario.goal.lowercased())."
            let duration = conversationService.currentConversation?.duration ?? Date().timeIntervalSince(conversationStart)

            let summary = ConversationSummary(
                date: Date(),
                scenarioTitle: currentScenario.title,
                duration: duration,
                highlights: highlights,
                recommendations: recommendations
            )

            await MainActor.run {
                authManager.recordConversation(summary)
            }
        }
    }

    func fallbackHighlight() -> String {
        if let lastAssistant = conversationService.conversationHistory.last(where: { $0.sender == .assistant }) {
            return lastAssistant.content
        }
        return "Great effort in practicing conversations today!"
    }

    func appendSystemMessage(_ text: String) {
        let message = ConversationMessage(
            id: UUID(),
            content: text,
            sender: .assistant,
            timestamp: Date(),
            emotionalTone: .supportive
        )
        conversationService.conversationHistory.append(message)
    }

    var formattedDuration: String {
        let interval = Date().timeIntervalSince(conversationStart)
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02dm %02ds", minutes, seconds)
    }

    var positivityScore: String {
        let positives = conversationService.conversationHistory.filter { $0.emotionalTone == .supportive }.count
        let total = max(conversationService.conversationHistory.count, 1)
        let percentage = Int(Double(positives) / Double(total) * 100)
        return "\(percentage)%"
    }
}

// MARK: - Scenario palette
private enum ScenarioPalette: String, CaseIterable, Identifiable {
    case socialGreeting
    case askingForHelp
    case expressingFeelings
    case dailyActivities

    var id: String { rawValue }

    var scenario: ConversationScenario {
        switch self {
        case .socialGreeting:
            ConversationScenario(
                id: "social_greeting",
                title: "Social Greeting",
                description: "Practice greeting people and making small talk",
                topic: "greetings",
                goal: "Learn appropriate ways to greet others",
                difficulty: 1
            )
        case .askingForHelp:
            ConversationScenario(
                id: "asking_help",
                title: "Asking for Help",
                description: "Practice asking for assistance politely",
                topic: "help_requests",
                goal: "Learn to ask for help when needed",
                difficulty: 2
            )
        case .expressingFeelings:
            ConversationScenario(
                id: "expressing_feelings",
                title: "Expressing Feelings",
                description: "Practice talking about emotions",
                topic: "emotions",
                goal: "Learn to express feelings appropriately",
                difficulty: 3
            )
        case .dailyActivities:
            ConversationScenario(
                id: "daily_activities",
                title: "Daily Activities",
                description: "Practice talking about daily routines",
                topic: "daily_life",
                goal: "Learn to discuss daily activities",
                difficulty: 1
            )
        }
    }

    var title: String { scenario.title }
    var subtitle: String { scenario.goal }
    var icon: String {
        switch self {
        case .socialGreeting: return "hand.wave"
        case .askingForHelp: return "questionmark.circle"
        case .expressingFeelings: return "heart.bubble"
        case .dailyActivities: return "calendar"
        }
    }
    var colors: [Color] {
        switch self {
        case .socialGreeting: return [Color.blue, Color.purple]
        case .askingForHelp: return [Color.green, Color.teal]
        case .expressingFeelings: return [Color.pink, Color.orange]
        case .dailyActivities: return [Color.cyan, Color.indigo]
        }
    }
    var goal: String { scenario.goal }
    var goalKeyword: String {
        switch self {
        case .socialGreeting: return "Small talk"
        case .askingForHelp: return "Politeness"
        case .expressingFeelings: return "Emotions"
        case .dailyActivities: return "Routines"
        }
    }
    var quickResponses: [String] {
        switch scenario.topic {
        case "greetings":
            return ["Hello!", "How are you?", "Nice to meet you", "Good morning"]
        case "help_requests":
            return ["Can you help me?", "I need assistance", "Could you please...", "Thank you"]
        case "emotions":
            return ["I feel happy", "I'm sad", "I'm excited", "I'm worried"]
        case "daily_life":
            return ["I went to school", "I ate breakfast", "I played games", "I watched TV"]
        default:
            return ["Yes", "No", "Maybe", "I understand"]
        }
    }
}

private struct CapabilityBadge: View {
    let level: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "star.fill")
                .font(.caption2)
            Text("Level \(level)")
                .font(.caption2.weight(.semibold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.18))
        )
    }
}

// MARK: - Message bubble
private struct MessageBubble: View {
    let message: ConversationMessage

    var body: some View {
        HStack(alignment: .bottom) {
            if message.sender == .assistant {
                VStack(alignment: .leading, spacing: 8) {
                    Label("AURA Coach", systemImage: "sparkle")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.7))
                    VStack(alignment: .leading, spacing: 8) {
                        Text(message.content)
                            .font(.subheadline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .fill(LinearGradient(colors: [.purple.opacity(0.75), .indigo.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            )
                        ToneChip(tone: message.emotionalTone)
                    }
                    timestamp
                }
                Spacer()
            } else {
                Spacer()
                VStack(alignment: .trailing, spacing: 8) {
                    Text("You")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.7))
                    VStack(alignment: .trailing, spacing: 8) {
                        Text(message.content)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .fill(LinearGradient(colors: [.cyan.opacity(0.9), .blue.opacity(0.75)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            )
                        ToneChip(tone: message.emotionalTone)
                    }
                    timestamp
                }
            }
        }
        .transition(.opacity.combined(with: .move(edge: message.sender == .assistant ? .leading : .trailing)))
    }

    private var timestamp: some View {
        Text(message.timestamp, style: .time)
            .font(.caption2)
            .foregroundStyle(.white.opacity(0.55))
    }
}

private struct ToneChip: View {
    let tone: EmotionalTone

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: tone.icon)
            Text(tone.label)
        }
        .font(.caption2)
        .foregroundStyle(.white.opacity(0.8))
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(
            Capsule(style: .continuous)
                .fill(Color.white.opacity(0.12))
        )
    }
}

// MARK: - Footer metric
private struct FooterMetric: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.white.opacity(0.8))
            Text(value)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
            Text(title)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity)
    }
}

private struct TypingIndicator: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        HStack(spacing: 10) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.white.opacity(0.7))
                    .frame(width: 10, height: 10)
                    .scaleEffect(scales[index])
            }
            Text("AURA is thinking…")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
            Spacer()
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.white.opacity(0.08))
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                phase = 1
            }
        }
    }

    private var scales: [CGFloat] {
        [phase, abs(phase - 0.5), phase]
    }
}

// MARK: - Tone helpers
private extension EmotionalTone {
    var icon: String {
        switch self {
        case .supportive: return "heart"
        case .encouraging: return "hand.thumbsup"
        case .corrective: return "exclamationmark.bubble"
        case .neutral: return "ellipsis"
        }
    }

    var label: String {
        switch self {
        case .supportive: return "Supportive"
        case .encouraging: return "Encouraging"
        case .corrective: return "Coaching"
        case .neutral: return "Neutral"
        }
    }
}
