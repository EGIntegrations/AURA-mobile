#!/bin/bash

echo "🔧 Fixing FoundationModels Framework Linking..."

# Backup the original project file
cp AURA.xcodeproj/project.pbxproj AURA.xcodeproj/project.pbxproj.backup

# Update deployment target to iOS 18.0 for FoundationModels support
sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = 18.5;/IPHONEOS_DEPLOYMENT_TARGET = 18.0;/g' AURA.xcodeproj/project.pbxproj

# Make FoundationModels framework optional (weak linking)
sed -i '' 's/9DF5B6FD2E0B055B0084087D \/\* FoundationModels.framework in Frameworks \*\//9DF5B6FD2E0B055B0084087D \/\* FoundationModels.framework in Frameworks \*\/ = {settings = {ATTRIBUTES = (Weak, ); }; }/g' AURA.xcodeproj/project.pbxproj

# Add framework search paths for FoundationModels
sed -i '' 's/FRAMEWORK_SEARCH_PATHS = /FRAMEWORK_SEARCH_PATHS = ("$(PLATFORM_DIR)\/Developer\/Library\/Frameworks", /g' AURA.xcodeproj/project.pbxproj

echo "✅ Framework linking fixed!"
echo "📱 Deployment target updated to iOS 18.0"
echo "🔗 FoundationModels framework set to weak linking"
echo ""
echo "🎯 Next steps:"
echo "1. Open project in Xcode Beta"
echo "2. Clean build folder (⌘+Shift+K)"
echo "3. Build project (⌘+B)"
echo ""
echo "💡 If you don't have Xcode Beta, the app will still work with regular Xcode using fallback responses!"