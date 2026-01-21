import LocalAuthentication

/// Handles Face ID / Touch ID availability and evaluation.
/// Encapsulated so Auth views and manager can call into a single place.
final class BiometricAuthManager {
    static let shared = BiometricAuthManager()

    private let savedUserKey = "aura_saved_biometric_user"

    enum BiometricType {
        case none
        case faceID
        case touchID
        case opticID
    }

    private init() {}

    var biometricType: BiometricType {
        let context = makeContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID:  return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        default:       return .none
        }
    }

    func canEvaluate() -> Bool {
        let context = makeContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    func authenticate(reason: String = "Sign in to AURA", completion: @escaping (Result<String, Error>) -> Void) {
        guard canEvaluate() else {
            completion(.failure(BiometricError.unavailable))
            return
        }

        let context = makeContext()
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { [weak self] success, error in
            guard let self else { return }

            if success {
                DispatchQueue.main.async {
                    if let savedUser = self.savedUsername {
                        completion(.success(savedUser))
                    } else {
                        completion(.failure(BiometricError.noSavedUser))
                    }
                }
            } else if let error {
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
            } else {
                DispatchQueue.main.async {
                    completion(.failure(BiometricError.unknown))
                }
            }
        }
    }

    var savedUsername: String? {
        UserDefaults.standard.string(forKey: savedUserKey)
    }

    func save(username: String) {
        UserDefaults.standard.set(username, forKey: savedUserKey)
    }

    func clearSavedUser() {
        UserDefaults.standard.removeObject(forKey: savedUserKey)
    }

    private func makeContext() -> LAContext {
        let context = LAContext()
        context.localizedCancelTitle = "Use Passcode"
        return context
    }
}

enum BiometricError: LocalizedError {
    case unavailable
    case noSavedUser
    case unknown

    var errorDescription: String? {
        switch self {
        case .unavailable:
            return "Biometric authentication isn't available on this device."
        case .noSavedUser:
            return "No saved biometric profile. Sign in once with your password to enable it."
        case .unknown:
            return "Biometric authentication failed. Please try again."
        }
    }
}
