import SwiftUI

// MARK: - API Key Configuration View
struct APIKeyConfigurationView: View {
    private let apiKeyManager = APIKeyManager.shared
    @StateObject private var usageTracker = APIUsageTracker.shared
    
    @State private var showingKeyInput = false
    @State private var selectedService: APIService?
    @State private var keyInput = ""
    @State private var validationStatus: [APIService: Bool] = [:]
    @State private var isValidating = false
    
    var body: some View {
        NavigationView {
            List {
                // API Keys Section
                Section(header: Text("OpenAI Services")) {
                    ForEach([APIService.chatbot, .imageGeneration, .vision, .speechToText, .textToSpeech], id: \.self) { service in
                        APIKeyRow(
                            service: service,
                            isConfigured: apiKeyManager.hasValidAPIKey(for: service),
                            isValidated: validationStatus[service] ?? false,
                            onConfigure: {
                                selectedService = service
                                showingKeyInput = true
                            }
                        )
                    }
                }
                
                Section(header: Text("Voice Services")) {
                    APIKeyRow(
                        service: .elevenLabs,
                        isConfigured: apiKeyManager.hasValidAPIKey(for: .elevenLabs),
                        isValidated: validationStatus[.elevenLabs] ?? false,
                        onConfigure: {
                            selectedService = .elevenLabs
                            showingKeyInput = true
                        }
                    )
                }
                
                Section(header: Text("Alternative Services (Optional)")) {
                    ForEach([APIService.anthropic, .replicate, .assemblyAI], id: \.self) { service in
                        APIKeyRow(
                            service: service,
                            isConfigured: apiKeyManager.hasValidAPIKey(for: service),
                            isValidated: validationStatus[service] ?? false,
                            onConfigure: {
                                selectedService = service
                                showingKeyInput = true
                            }
                        )
                    }
                }
                
                // Usage Analytics Section
                Section(header: Text("API Usage Today")) {
                    ForEach(Array(usageTracker.dailyUsage.keys), id: \.self) { service in
                        HStack {
                            Text(service.displayName)
                            Spacer()
                            Text("\(usageTracker.dailyUsage[service] ?? 0) requests")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    HStack {
                        Text("Estimated Cost")
                            .fontWeight(.bold)
                        Spacer()
                        Text("$\(usageTracker.getEstimatedCost(), specifier: "%.2f")")
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                    }
                }
                
                // Actions Section
                Section {
                    Button("Validate All Keys") {
                        Task {
                            await validateAllKeys()
                        }
                    }
                    .disabled(isValidating)
                    
                    Button("Reset Daily Usage") {
                        usageTracker.resetDailyUsage()
                    }
                    .foregroundColor(.orange)
                    
                    Button("Export Usage Data") {
                        exportUsageData()
                    }
                }
            }
            .navigationTitle("API Configuration")
            .sheet(isPresented: $showingKeyInput) {
                if let service = selectedService {
                    APIKeyInputView(
                        service: service,
                        onSave: { key in
                            apiKeyManager.setAPIKey(key, for: service)
                            showingKeyInput = false
                            
                            // Validate the new key
                            Task {
                                await validateKey(for: service)
                            }
                        },
                        onCancel: {
                            showingKeyInput = false
                            keyInput = ""
                        }
                    )
                }
            }
        }
        .onAppear {
            Task {
                await validateAllKeys()
            }
        }
    }
    
    // MARK: - Validation Methods
    private func validateAllKeys() async {
        isValidating = true
        
        for service in APIService.allCases {
            if apiKeyManager.hasValidAPIKey(for: service) {
                await validateKey(for: service)
            }
        }
        
        isValidating = false
    }
    
    private func validateKey(for service: APIService) async {
        let key = apiKeyManager.getAPIKey(for: service, fallback: "")
        let isValid = await apiKeyManager.validateAPIKey(key, for: service)
        
        await MainActor.run {
            validationStatus[service] = isValid
        }
    }
    
    private func exportUsageData() {
        // TODO: Implement usage data export
        print("Exporting usage data...")
    }
}

// MARK: - API Key Row Component
struct APIKeyRow: View {
    let service: APIService
    let isConfigured: Bool
    let isValidated: Bool
    let onConfigure: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(service.displayName)
                    .font(.body)
                Text(service.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if isConfigured {
                if isValidated {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else {
                    Image(systemName: "exclamationmark.circle.fill")
                        .foregroundColor(.orange)
                }
            } else {
                Image(systemName: "plus.circle")
                    .foregroundColor(.blue)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onConfigure()
        }
    }
}

// MARK: - API Key Input View
struct APIKeyInputView: View {
    let service: APIService
    let onSave: (String) -> Void
    let onCancel: () -> Void
    
    @State private var apiKey = ""
    @State private var showingKey = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Configure \(service.displayName)")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Enter your API key for \(service.displayName)")
                        .foregroundColor(.secondary)
                    
                    if let instructions = getInstructions(for: service) {
                        Text(instructions)
                            .font(.caption)
                            .foregroundColor(.blue)
                            .padding(.top, 5)
                    }
                }
                .padding()
                
                VStack(alignment: .leading) {
                    HStack {
                        if showingKey {
                            TextField("API Key", text: $apiKey)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        } else {
                            SecureField("API Key", text: $apiKey)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        Button(action: {
                            showingKey.toggle()
                        }) {
                            Image(systemName: showingKey ? "eye.slash" : "eye")
                        }
                    }
                    
                    Text("Environment Variable: \(service.environmentKey)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                
                Spacer()
                
                HStack(spacing: 20) {
                    Button("Cancel") {
                        onCancel()
                    }
                    .foregroundColor(.red)
                    
                    Button("Save") {
                        onSave(apiKey)
                    }
                    .disabled(apiKey.isEmpty)
                    .buttonStyle(.borderedProminent)
                }
                .padding()
            }
            .navigationTitle("API Key")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func getInstructions(for service: APIService) -> String? {
        switch service {
        case .chatbot, .imageGeneration, .vision, .speechToText, .textToSpeech:
            return "Get your OpenAI API key from platform.openai.com"
        case .elevenLabs:
            return "Get your ElevenLabs API key from elevenlabs.io"
        case .anthropic:
            return "Get your Anthropic API key from console.anthropic.com"
        case .replicate:
            return "Get your Replicate API key from replicate.com"
        case .assemblyAI:
            return "Get your AssemblyAI API key from assemblyai.com"
        }
    }
}

// MARK: - Preview
#Preview {
    APIKeyConfigurationView()
}