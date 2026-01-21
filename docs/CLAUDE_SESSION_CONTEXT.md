# CLAUDE SESSION CONTEXT - AURA App Development

## Project Overview
This is an autism training app called "AURA" (Autism Understanding & Recognition Assistant) built in SwiftUI. The app includes emotion recognition games, vocabulary practice, facial mimicry training, and admin dashboards for teachers/parents.

## Critical Persistent Issues
**READ THE PERSISTENT_ISSUES_REPORT.md FILE FIRST** - it contains detailed examples of 4 major issues that have been repeatedly attempted to fix but still don't work:

1. **Login button not working** - requires app restart to authenticate
2. **Menu button not working** - doesn't dismiss game views
3. **Admin quick action buttons not working** - don't show alert dialogs
4. **Real images not loading** - shows emoji fallbacks instead of kaggle dataset photos

## Previous Fix Attempts Made
### Authentication Fixes
- Changed AuthenticationView from `@StateObject` to `@EnvironmentObject`
- Added debug logging to AuthenticationManager.signIn()
- Verified ContentView passes authManager as environmentObject

### Navigation Fixes
- Removed NavigationView from GameView, VocabularyView, VocabularyWithSpeechView  
- Added NavigationStack wrappers around fullScreenCover presentations in ContentView
- Added proper `@Environment(\.dismiss)` usage

### Admin Dashboard Fixes
- Added state variables for alert dialogs (showingResourceSharing, showingReportGeneration)
- Fixed AdminOverviewTab to accept @Binding parameters for state variables
- Added proper alert modifiers to AdminDashboardView

### Image Loading Fixes
- Updated ImageDatasetManager to use `Bundle.main.path(forResource:ofType:inDirectory:)`
- Added DatasetImages folder to Xcode project as blue folder reference
- Added comprehensive debug logging for image loading paths
- Enhanced fallback system for when images don't load

## Current Code State
All fixes appear to be properly implemented in the source files:
- AuthenticationView.swift uses @EnvironmentObject
- GameView.swift has dismiss() in Menu button
- AdminDashboardView.swift has proper state bindings and alert modifiers
- ImageDatasetManager.swift has bundle loading with inDirectory parameter
- ContentView.swift wraps fullScreenCover views in NavigationStack

## What's NOT Working
Despite code appearing correct, the actual app behavior doesn't match:
- UI buttons don't trigger their associated actions
- Navigation doesn't respond to dismiss() calls
- Authentication flow doesn't complete
- Image loading falls back to emoji generation

## Files Structure
```
AutismTrainerApp/
├── ContentView.swift (main navigation)
├── Views/
│   ├── AuthenticationView.swift (login)
│   ├── GameView.swift (emotion recognition)
│   ├── AdminDashboardView.swift (admin interface)
│   ├── VocabularyView.swift (speech practice)
│   └── VocabularyWithSpeechView.swift (speech practice with SiriKit)
├── Services/
│   ├── AuthenticationManager.swift (user management)
│   └── ImageDatasetManager.swift (image loading)
├── Models/
│   └── [User, GameQuestion, etc.]
└── DatasetImages/ (kaggle facial emotion images)
```

## Debugging Approach Needed
1. **Systematic testing** - Add print statements to button actions to see if they're being called
2. **Navigation debugging** - Verify NavigationStack setup is working
3. **Environment object debugging** - Check if @EnvironmentObject is properly injected
4. **Image loading debugging** - Check console output for bundle loading messages
5. **Build verification** - Ensure latest changes are actually being compiled

## Key Technical Details
- iOS 18.5 deployment target
- SwiftUI with NavigationStack (not NavigationView)
- Uses @EnvironmentObject for shared state
- fullScreenCover presentations for main game views
- Bundle-based image loading for iOS app sandboxing
- Demo authentication with hardcoded users (teacher1/demo, parent1/demo, student1/demo)

## Success Criteria
App should have:
- ✅ Working login that authenticates immediately
- ✅ Menu buttons that dismiss views properly  
- ✅ Admin quick actions that show alert dialogs
- ✅ Real facial photos in emotion recognition games
- ✅ All navigation flows working smoothly

## Next Session Instructions
1. **Read PERSISTENT_ISSUES_REPORT.md first** for detailed reproduction steps
2. **Test the current build** to verify issues still exist
3. **Add systematic debugging** with print statements to identify where the disconnect is
4. **Focus on ONE issue at a time** rather than trying to fix everything simultaneously
5. **Verify changes are actually being compiled** by checking build logs or adding obvious UI changes first