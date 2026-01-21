import Foundation

// MARK: - User Models

enum UserRole: String, CaseIterable, Codable {
    case student
    case teacher
    case parent
    case admin

    var displayName: String {
        switch self {
        case .student: "Student"
        case .teacher: "Teacher"
        case .parent: "Parent"
        case .admin: "Administrator"
        }
    }

    var permissions: [Permission] {
        switch self {
        case .student:
            [.playGames, .viewOwnProgress]
        case .teacher:
            [.playGames, .viewOwnProgress, .viewStudentProgress, .manageStudents, .shareContent]
        case .parent:
            [.playGames, .viewOwnProgress, .viewChildProgress, .manageChildren, .shareContent]
        case .admin:
            Permission.allCases
        }
    }
}

enum Permission: String, CaseIterable, Codable {
    case playGames
    case viewOwnProgress
    case viewStudentProgress
    case viewChildProgress
    case manageStudents
    case manageChildren
    case shareContent
    case manageUsers
    case accessAnalytics
}

struct User: Identifiable, Codable {
    var id: UUID
    var username: String
    var email: String
    var displayName: String
    var role: UserRole
    var profileImageData: Data?
    var createdAt: Date
    var lastLoginAt: Date?
    var isActive: Bool
    var passwordHash: String
    var progress: PlayerProgress

    // Relationships
    var supervisorId: UUID?
    var supervisedUserIds: [UUID]

    // Settings
    var settings: UserSettings

    init(
        id: UUID = UUID(),
        username: String,
        email: String,
        displayName: String,
        role: UserRole,
        passwordHash: String,
        profileImageData: Data? = nil,
        createdAt: Date = Date(),
        lastLoginAt: Date? = nil,
        isActive: Bool = true,
        supervisorId: UUID? = nil,
        supervisedUserIds: [UUID] = [],
        settings: UserSettings = UserSettings(),
        progress: PlayerProgress = PlayerProgress()
    ) {
        self.id = id
        self.username = username
        self.email = email
        self.displayName = displayName
        self.role = role
        self.passwordHash = passwordHash
        self.profileImageData = profileImageData
        self.createdAt = createdAt
        self.lastLoginAt = lastLoginAt
        self.isActive = isActive
        self.supervisorId = supervisorId
        self.supervisedUserIds = supervisedUserIds
        self.settings = settings
        self.progress = progress
    }

    func hasPermission(_ permission: Permission) -> Bool {
        role.permissions.contains(permission)
    }

    mutating func updateProgress(_ progress: PlayerProgress) {
        self.progress = progress
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case username
        case email
        case displayName
        case role
        case profileImageData
        case createdAt
        case lastLoginAt
        case isActive
        case passwordHash
        case progress
        case supervisorId
        case supervisedUserIds
        case settings
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        username = try container.decode(String.self, forKey: .username)
        email = try container.decodeIfPresent(String.self, forKey: .email) ?? ""
        displayName = try container.decode(String.self, forKey: .displayName)
        role = try container.decode(UserRole.self, forKey: .role)
        profileImageData = try container.decodeIfPresent(Data.self, forKey: .profileImageData)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        lastLoginAt = try container.decodeIfPresent(Date.self, forKey: .lastLoginAt)
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        passwordHash = try container.decodeIfPresent(String.self, forKey: .passwordHash) ?? ""
        progress = try container.decodeIfPresent(PlayerProgress.self, forKey: .progress) ?? PlayerProgress()
        supervisorId = try container.decodeIfPresent(UUID.self, forKey: .supervisorId)
        supervisedUserIds = try container.decodeIfPresent([UUID].self, forKey: .supervisedUserIds) ?? []
        settings = try container.decodeIfPresent(UserSettings.self, forKey: .settings) ?? UserSettings()
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(username, forKey: .username)
        try container.encode(email, forKey: .email)
        try container.encode(displayName, forKey: .displayName)
        try container.encode(role, forKey: .role)
        try container.encodeIfPresent(profileImageData, forKey: .profileImageData)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(lastLoginAt, forKey: .lastLoginAt)
        try container.encode(isActive, forKey: .isActive)
        try container.encode(passwordHash, forKey: .passwordHash)
        try container.encode(progress, forKey: .progress)
        try container.encodeIfPresent(supervisorId, forKey: .supervisorId)
        try container.encode(supervisedUserIds, forKey: .supervisedUserIds)
        try container.encode(settings, forKey: .settings)
    }
}

struct UserSettings: Codable {
    var enableNotifications: Bool = true
    var enableVoiceFeedback: Bool = true
    var enableSpeechRecognition: Bool = true
    var difficultyLevel: Int = 1
    var sessionLength: Int = 10
    var autoProgressToNextLevel: Bool = true
    var shareProgressWithSupervisor: Bool = true
}

// MARK: - Learner Groups

struct LearnerGroup: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var description: String
    var adminId: UUID
    var memberIds: [UUID]
    var createdAt: Date = Date()
    var isActive: Bool = true
}

// MARK: - Progress Sharing

struct ProgressShare: Identifiable {
    let id = UUID()
    var fromUserId: UUID
    var toUserId: UUID
    var progressData: SharedProgressData
    var sharedAt: Date
    var expiresAt: Date?

    init(fromUserId: UUID, toUserId: UUID, progressData: SharedProgressData) {
        self.fromUserId = fromUserId
        self.toUserId = toUserId
        self.progressData = progressData
        self.sharedAt = Date()
        self.expiresAt = Calendar.current.date(byAdding: .day, value: 30, to: Date())
    }
}

struct SharedProgressData {
    var totalScore: Int
    var totalSessions: Int
    var overallAccuracy: Double
    var currentLevel: Int
    var achievements: [String]
    var lastUpdated: Date
}
