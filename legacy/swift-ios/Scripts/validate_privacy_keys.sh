#!/bin/bash
set -euo pipefail

INFO_PLIST_PATH="${1:-Info.plist}"
PROJECT_FILE="${2:-AURA.xcodeproj/project.pbxproj}"
REQUIRED_KEYS=(
  NSFaceIDUsageDescription
  NSCameraUsageDescription
  NSMicrophoneUsageDescription
  NSSpeechRecognitionUsageDescription
)

missing=()
for key in "${REQUIRED_KEYS[@]}"; do
  plist_has_key=0
  /usr/libexec/PlistBuddy -c "Print :${key}" "$INFO_PLIST_PATH" >/dev/null 2>&1 && plist_has_key=1

  project_has_key=0
  if [[ -f "$PROJECT_FILE" ]]; then
    if grep -q "INFOPLIST_KEY_${key}" "$PROJECT_FILE"; then
      project_has_key=1
    fi
  fi

  if [[ $plist_has_key -eq 0 && $project_has_key -eq 0 ]]; then
    missing+=("$key")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing privacy purpose strings:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "All required privacy keys present in ${INFO_PLIST_PATH}."
