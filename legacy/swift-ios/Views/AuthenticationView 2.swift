import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject private var authManager: AuthenticationManager

    @State private var isSignUp = false
    @State private var username = ""
    @State private var email = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var selectedRole = UserRole.student
    @State private var showRolePicker = false
    @State private var biometricType: BiometricAuthManager.BiometricType = .none
    @State private var biometricMessage: String?

    @FocusState private var focusedField: Field?

    private enum Field {
        case username
        case email
        case displayName
        case password
        case confirmPassword
    }

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                AnimatedAuroraBackground()
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 32) {
                        branding
                        formCard
                        demoAccounts
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, max(proxy.safeAreaInsets.top + 24, 48))
                    .padding(.bottom, 80)
                    .frame(maxWidth: 768)
                    .frame(minHeight: proxy.size.height)
                }

                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(1.4)
                        .padding(32)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                }
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onAppear(perform: refreshBiometricAvailability)
        .onChange(of: isSignUp) {
            focusedField = isSignUp ? .email : .username
        }
        .alert("Biometric Sign-In", isPresented: Binding(get: { biometricMessage != nil }, set: { if !$0 { biometricMessage = nil } })) {
            Button("OK", role: .cancel) { biometricMessage = nil }
        } message: {
            Text(biometricMessage ?? "")
        }
        .alert("Error", isPresented: Binding(get: { authManager.error != nil }, set: { if !$0 { authManager.error = nil } })) {
            Button("OK", role: .cancel) { authManager.error = nil }
        } message: {
            Text(authManager.error?.errorDescription ?? "An unknown error occurred")
        }
        .confirmationDialog("Select Role", isPresented: $showRolePicker) {
            ForEach(UserRole.allCases, id: \.self) { role in
                Button(role.displayName) { selectedRole = role }
            }
        }
    }

    // MARK: - Sections

    private var branding: some View {
        VStack(spacing: 8) {
            Text("AURA")
                .font(.system(size: 56, weight: .bold, design: .rounded))
                .foregroundStyle(Gradient(colors: [.white.opacity(0.9), .white.opacity(0.6)]))
                .shadow(color: .black.opacity(0.18), radius: 12, x: 0, y: 8)

            Text("Autism Understanding & Recognition Assistant")
                .font(.headline)
                .multilineTextAlignment(.center)
                .foregroundColor(.white.opacity(0.85))

            Text(isSignUp ? "Create a profile tailored to your role" : "Sign in to continue your journey")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
        }
        .padding(.horizontal)
    }

    private var formCard: some View {
        VStack(spacing: 24) {
            Picker("Authentication Mode", selection: $isSignUp) {
                Text("Sign In").tag(false)
                Text("Sign Up").tag(true)
            }
            .pickerStyle(.segmented)

            VStack(spacing: 16) {
                inputField(
                    title: "Username",
                    systemImage: "person",
                    text: $username,
                    content: {
                        TextField("Username", text: $username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.asciiCapable)
                            .focused($focusedField, equals: .username)
                            .submitLabel(isSignUp ? .next : .go)
                            .onSubmit { handlePrimarySubmit(from: .username) }
                    }
                )

                if isSignUp {
                    inputField(
                        title: "Email",
                        systemImage: "envelope",
                        text: $email,
                        content: {
                            TextField("Email", text: $email)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .focused($focusedField, equals: .email)
                                .submitLabel(.next)
                                .onSubmit { handlePrimarySubmit(from: .email) }
                        }
                    )

                    inputField(
                        title: "Display Name",
                        systemImage: "person.text.rectangle",
                        text: $displayName,
                        content: {
                            TextField("Display Name", text: $displayName)
                                .textInputAutocapitalization(.words)
                                .focused($focusedField, equals: .displayName)
                                .submitLabel(.next)
                                .onSubmit { handlePrimarySubmit(from: .displayName) }
                        }
                    )

                    roleSelector
                }

                inputField(
                    title: "Password",
                    systemImage: "lock",
                    text: $password,
                    content: {
                        SecureField("Password", text: $password)
                            .focused($focusedField, equals: .password)
                            .submitLabel(isSignUp ? .next : .go)
                            .onSubmit { handlePrimarySubmit(from: .password) }
                    }
                )

                if isSignUp {
                    inputField(
                        title: "Confirm Password",
                        systemImage: "lock.rotation",
                        text: $confirmPassword,
                        content: {
                            SecureField("Confirm Password", text: $confirmPassword)
                                .focused($focusedField, equals: .confirmPassword)
                                .submitLabel(.go)
                                .onSubmit { handlePrimarySubmit(from: .confirmPassword) }
                        }
                    )
                }
            }

            VStack(spacing: 14) {
                Button(action: primaryAction) {
                    Text(isSignUp ? "Create Account" : "Sign In")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .foregroundStyle(.white)
                        .background(Color.accentColor.gradient, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(authManager.isLoading)
                .shadow(color: .blue.opacity(0.25), radius: 10, x: 0, y: 8)

                if biometricType != .none && !isSignUp {
                    Button(action: authenticateWithBiometrics) {
                        HStack(spacing: 10) {
                            Image(systemName: biometricIcon(for: biometricType))
                            Text("Sign in with \(biometricLabel(for: biometricType))")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .disabled(authManager.isLoading)
                }

                Button(action: toggleAuthMode) {
                    Text(isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding(.top, 4)
            }
        }
        .padding(28)
        .background(
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.15), radius: 24, x: 0, y: 18)
        )
    }

    private var roleSelector: some View {
        Button {
            showRolePicker = true
        } label: {
            HStack {
                Label("\(selectedRole.displayName)", systemImage: "person.3")
                    .labelStyle(.titleAndIcon)
                Spacer()
                Image(systemName: "chevron.down")
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Color.white.opacity(0.15), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private var demoAccounts: some View {
        VStack(spacing: 12) {
            Text("Quick demo logins")
                .font(.footnote)
                .foregroundColor(.white.opacity(0.75))

            HStack(spacing: 10) {
                demoChip(label: "Teacher", username: "teacher1")
                demoChip(label: "Parent", username: "parent1")
                demoChip(label: "Student", username: "student1")
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Private helpers

    private func inputField<Content: View>(title: String, systemImage: String, text: Binding<String>, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: systemImage)
                .font(.caption)
                .foregroundColor(.white.opacity(0.75))

            content()
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.white.opacity(0.14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                )
                .foregroundColor(.white)
        }
        .font(.body.weight(.medium))
    }

    private func demoChip(label: String, username: String) -> some View {
        Button {
            self.username = username
            self.password = "demo"
            focusedField = .password
        } label: {
            Text(label)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule(style: .continuous)
                        .fill(Color.white.opacity(0.18))
                        .overlay(
                            Capsule(style: .continuous)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                )
                .foregroundColor(.white)
        }
        .buttonStyle(.plain)
    }

    private func primaryAction() {
        if isSignUp {
            handleSignUp()
        } else {
            handleSignIn()
        }
    }

    private func handlePrimarySubmit(from field: Field) {
        switch field {
        case .username:
            if isSignUp {
                focusedField = .email
            } else {
                handleSignIn()
            }
        case .email:
            focusedField = .displayName
        case .displayName:
            focusedField = .password
        case .password:
            if isSignUp {
                focusedField = .confirmPassword
            } else {
                handleSignIn()
            }
        case .confirmPassword:
            handleSignUp()
        }
    }

    private func handleSignIn() {
        guard !username.isEmpty, !password.isEmpty else {
            authManager.error = .invalidCredentials
            return
        }

        authManager.signIn(username: username.trimmingCharacters(in: .whitespacesAndNewlines), password: password)

        if authManager.error == nil, BiometricAuthManager.shared.canEvaluate() {
            BiometricAuthManager.shared.save(username: username)
        }
    }

    private func handleSignUp() {
        guard !username.isEmpty,
              !email.isEmpty,
              !displayName.isEmpty,
              !password.isEmpty,
              password == confirmPassword else {
            authManager.error = .invalidCredentials
            return
        }

        authManager.signUp(
            username: username.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            displayName: displayName.trimmingCharacters(in: .whitespacesAndNewlines),
            role: selectedRole,
            password: password
        )

        if authManager.error == nil, BiometricAuthManager.shared.canEvaluate() {
            BiometricAuthManager.shared.save(username: username)
        }
    }

    private func authenticateWithBiometrics() {
        BiometricAuthManager.shared.authenticate { result in
            switch result {
            case .success(let savedUsername):
                authManager.signInWithBiometrics(username: savedUsername)
            case .failure(let error):
                biometricMessage = (error as? BiometricError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func toggleAuthMode() {
        withAnimation(.spring(response: 0.5, dampingFraction: 0.9)) {
            isSignUp.toggle()
            clearFields(retainUsername: !isSignUp)
        }
    }

    private func clearFields(retainUsername: Bool) {
        if !retainUsername { username = "" }
        email = ""
        displayName = ""
        password = ""
        confirmPassword = ""
        selectedRole = .student
    }

    private func refreshBiometricAvailability() {
        biometricType = BiometricAuthManager.shared.biometricType
    }

    private func biometricLabel(for type: BiometricAuthManager.BiometricType) -> String {
        switch type {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        case .none: return "Biometrics"
        }
    }

    private func biometricIcon(for type: BiometricAuthManager.BiometricType) -> String {
        switch type {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        case .opticID: return "eye" // closest SF Symbol
        case .none: return "touchid"
        }
    }
}

// MARK: - Background

private struct AnimatedAuroraBackground: View {
    @State private var animate = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.blue.opacity(0.7), Color.purple.opacity(0.6), Color.cyan.opacity(0.5)],
                startPoint: animate ? .topLeading : .bottomTrailing,
                endPoint: animate ? .bottomTrailing : .topLeading
            )

            RadialGradient(
                gradient: Gradient(colors: [.white.opacity(0.35), .clear]),
                center: animate ? .bottomLeading : .topTrailing,
                startRadius: 80,
                endRadius: 460
            )
            .blendMode(.screen)

            Circle()
                .fill(LinearGradient(colors: [.pink.opacity(0.45), .clear], startPoint: .top, endPoint: .bottom))
                .frame(width: 380, height: 380)
                .blur(radius: 120)
                .offset(x: animate ? -140 : 140, y: animate ? -260 : 200)

            Circle()
                .fill(LinearGradient(colors: [.indigo.opacity(0.5), .clear], startPoint: .bottom, endPoint: .top))
                .frame(width: 320, height: 320)
                .blur(radius: 140)
                .offset(x: animate ? 160 : -120, y: animate ? 220 : -180)
        }
        .task {
            withAnimation(.easeInOut(duration: 12).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AuthenticationManager())
}
