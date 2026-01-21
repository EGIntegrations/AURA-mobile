import Foundation
import Combine
import CryptoKit

class AuthenticationManager: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var error: AuthError?
    
    private let userDefaults = UserDefaults.standard
    private let usersKey = "aura_users"
    private let currentUserKey = "aura_current_user"

    var currentProgress: PlayerProgress {
        currentUser?.progress ?? PlayerProgress()
    }

    init() {
        loadCurrentUser()
    }
    
    // MARK: - Authentication Methods
    
    func signUp(username: String, email: String, displayName: String, role: UserRole, password: String) {
        isLoading = true
        error = nil

        guard !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !password.isEmpty,
              password.count >= 4 else {
            error = .invalidCredentials
            isLoading = false
            return
        }

        if getUserByUsername(username) != nil {
            error = .userAlreadyExists
            isLoading = false
            return
        }

        let hashed = hashPassword(password)
        let newUser = User(
            username: username,
            email: email,
            displayName: displayName,
            role: role,
            passwordHash: hashed
        )

        var users = getAllUsers()
        users.append(newUser)
        saveUsers(users)

        signIn(user: newUser)
        BiometricAuthManager.shared.save(username: username)
    }

    func signIn(username: String, password: String) {
        print("DEBUG [AuthenticationManager]: signIn() called for username: '\(username)'")
        isLoading = true
        error = nil

        // For MVP, we'll do simple validation
        guard let user = getUserByUsername(username) else {
            print("DEBUG [AuthenticationManager]: User not found")
            error = .userNotFound
            isLoading = false
            return
        }

        guard user.isActive else {
            print("DEBUG [AuthenticationManager]: User inactive")
            error = .userInactive
            isLoading = false
            return
        }

        guard verifyPassword(password, matches: user.passwordHash) else {
            print("DEBUG [AuthenticationManager]: Invalid password")
            error = .invalidCredentials
            isLoading = false
            return
        }

        var updatedUser = user
        updatedUser.lastLoginAt = Date()
        persist(updatedUser)

        print("DEBUG [AuthenticationManager]: About to call signIn(user:)")
        signIn(user: updatedUser)
        print("DEBUG [AuthenticationManager]: After signIn(user:), isAuthenticated = \(isAuthenticated)")

        if error == nil, BiometricAuthManager.shared.canEvaluate() {
            BiometricAuthManager.shared.save(username: username)
        }
    }

    func signInWithBiometrics(username: String) {
        isLoading = true
        error = nil

        guard var user = getUserByUsername(username) else {
            error = .userNotFound
            isLoading = false
            return
        }

        guard user.isActive else {
            error = .userInactive
            isLoading = false
            return
        }

        user.lastLoginAt = Date()
        persist(user)
        signIn(user: user)
    }
    
    private func signIn(user: User) {
        print("DEBUG [AuthenticationManager]: signIn(user:) - Setting currentUser and isAuthenticated")
        // Explicitly dispatch to main thread to ensure UI updates
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.currentUser = user
            self.isAuthenticated = true
            self.isLoading = false
            print("DEBUG [AuthenticationManager]: State updated on main thread - isAuthenticated: \(self.isAuthenticated), user: \(user.displayName)")

            // Save current user to UserDefaults
            if let userData = try? JSONEncoder().encode(user) {
                self.userDefaults.set(userData, forKey: self.currentUserKey)
            }
        }
    }
    
    func signOut() {
        currentUser = nil
        isAuthenticated = false
        userDefaults.removeObject(forKey: currentUserKey)
    }
    
    func switchUser(to user: User) {
        guard currentUser?.role.permissions.contains(.manageUsers) == true else {
            error = .insufficientPermissions
            return
        }
        
        signIn(user: user)
    }
    
    // MARK: - User Management
    
    func createStudent(username: String, email: String, displayName: String, supervisorId: UUID, temporaryPassword: String = "demo") {
        guard let currentUser = currentUser,
              currentUser.hasPermission(.manageStudents) || currentUser.hasPermission(.manageChildren) else {
            error = .insufficientPermissions
            return
        }

        let student = User(
            username: username,
            email: email,
            displayName: displayName,
            role: .student,
            passwordHash: hashPassword(temporaryPassword),
            supervisorId: supervisorId
        )
        
        var users = getAllUsers()
        users.append(student)
        saveUsers(users)

        // Add student to supervisor's supervised list
        if let supervisorIndex = users.firstIndex(where: { $0.id == supervisorId }) {
            users[supervisorIndex].supervisedUserIds.append(student.id)
            saveUsers(users)
        }
    }

    func updateUser(_ user: User) {
        persist(user)
    }
    
    func deleteUser(userId: UUID) {
        guard let currentUser = currentUser,
              currentUser.hasPermission(.manageUsers) else {
            error = .insufficientPermissions
            return
        }
        
        var users = getAllUsers()
        users.removeAll { $0.id == userId }
        saveUsers(users)
    }
    
    func getSupervisedUsers() -> [User] {
        guard let currentUser = currentUser else { return [] }

        return getAllUsers().filter { user in
            currentUser.supervisedUserIds.contains(user.id)
        }
    }

    func getAllManagedUsers() -> [User] {
        getAllUsers()
    }
    
    func getSupervisor() -> User? {
        guard let currentUser = currentUser,
              let supervisorId = currentUser.supervisorId else { return nil }
        
        return getAllUsers().first { $0.id == supervisorId }
    }
    
    // MARK: - Data Management
    
    private func getAllUsers() -> [User] {
        guard let data = userDefaults.data(forKey: usersKey),
              let users = try? JSONDecoder().decode([User].self, from: data) else {
            return []
        }
        return users
    }

    private func saveUsers(_ users: [User]) {
        if let data = try? JSONEncoder().encode(users) {
            userDefaults.set(data, forKey: usersKey)
        }
    }

    private func getUserByUsername(_ username: String) -> User? {
        getAllUsers().first { $0.username.caseInsensitiveCompare(username) == .orderedSame }
    }
    
    private func loadCurrentUser() {
        guard let data = userDefaults.data(forKey: currentUserKey),
              let user = try? JSONDecoder().decode(User.self, from: data) else {
            return
        }
        
        currentUser = user
        isAuthenticated = true
    }
    
    // MARK: - Demo Data
    
    func createDemoData() {
        guard getAllUsers().isEmpty else { return }
        
        var teacher = User(
            username: "teacher1",
            email: "teacher@demo.com",
            displayName: "Ms. Smith",
            role: .teacher,
            passwordHash: hashPassword("demo")
        )
        var parent = User(
            username: "parent1",
            email: "parent@demo.com",
            displayName: "John Parent",
            role: .parent,
            passwordHash: hashPassword("demo")
        )
        let student1 = User(
            username: "student1",
            email: "student1@demo.com",
            displayName: "Alex",
            role: .student,
            passwordHash: hashPassword("demo"),
            supervisorId: teacher.id
        )
        let student2 = User(
            username: "student2",
            email: "student2@demo.com",
            displayName: "Sam",
            role: .student,
            passwordHash: hashPassword("demo"),
            supervisorId: parent.id
        )
        
        teacher.supervisedUserIds = [student1.id]
        parent.supervisedUserIds = [student2.id]
        
        let users = [teacher, parent, student1, student2]
        saveUsers(users)
    }

    // MARK: - Progress Recording

    func recordGameSession(_ session: GameSession) {
        updateProgress { progress in
            progress.recordGameSession(session)
        }
    }
    
    func recordSpeechPractice(_ result: SpeechPracticeResult) {
        updateProgress { progress in
            progress.recordSpeechPractice(result)
        }
    }
    
    func recordConversation(_ summary: ConversationSummary) {
        updateProgress { progress in
            progress.recordConversation(summary)
        }
    }
    
    func recordMimicrySession(_ session: MimicrySession) {
        updateProgress { progress in
            progress.recordMimicry(session)
        }
    }

    /// Persist newly unlocked emotion so UI reflects it immediately.
    func recordUnlockedEmotion(_ emotion: String) {
        updateProgress { progress in
            progress.unlockedEmotions.insert(emotion)
        }
    }

    private func updateProgress(_ updateBlock: (inout PlayerProgress) -> Void) {
        guard var user = currentUser else { return }
        var progress = user.progress
        updateBlock(&progress)
        user.updateProgress(progress)
        persist(user)
        DispatchQueue.main.async {
            self.currentUser = user
        }
    }

    // MARK: - Persistence Helpers

    private func persist(_ user: User) {
        var users = getAllUsers()
        if let index = users.firstIndex(where: { $0.id == user.id }) {
            users[index] = user
        } else {
            users.append(user)
        }
        saveUsers(users)
        if let current = currentUser, current.id == user.id {
            currentUser = user
            if let data = try? JSONEncoder().encode(user) {
                userDefaults.set(data, forKey: currentUserKey)
            }
        }
    }

    private func hashPassword(_ password: String) -> String {
        let salted = password + "::AURA::2025"
        let digest = SHA256.hash(data: Data(salted.utf8))
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }

    private func verifyPassword(_ password: String, matches hash: String) -> Bool {
        guard !hash.isEmpty else { return password.isEmpty }
        return hashPassword(password) == hash
    }
}

// MARK: - Error Handling

enum AuthError: Error, LocalizedError {
    case userAlreadyExists
    case userNotFound
    case userInactive
    case insufficientPermissions
    case invalidCredentials
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .userAlreadyExists:
            return "A user with this username already exists"
        case .userNotFound:
            return "User not found"
        case .userInactive:
            return "User account is inactive"
        case .insufficientPermissions:
            return "You don't have permission to perform this action"
        case .invalidCredentials:
            return "Invalid username or password"
        case .networkError:
            return "Network connection error"
        }
    }
}
