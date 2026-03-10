#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/Users/elliottgodwin/Developer/AURA-mobile"

TARGETS=(
  "$PROJECT_ROOT/node_modules"
  "$PROJECT_ROOT/.expo"
  "$PROJECT_ROOT/docs-site/node_modules"
  "$PROJECT_ROOT/docs-site/.docusaurus"
  "$PROJECT_ROOT/docs-site/build"
  "$PROJECT_ROOT/docs-site/.cache"
)

sum_kb() {
  local total=0
  local dir

  for dir in "${TARGETS[@]}"; do
    if [ -e "$dir" ]; then
      local size_kb
      size_kb=$(du -sk "$dir" | awk '{print $1}')
      total=$((total + size_kb))
    fi
  done

  echo "$total"
}

human_mb() {
  awk -v kb="$1" 'BEGIN { printf "%.2f MB", kb / 1024 }'
}

echo "Disk usage before cleanup:"
for dir in "${TARGETS[@]}"; do
  if [ -e "$dir" ]; then
    du -sh "$dir"
  else
    echo "0B $dir (not present)"
  fi
done

before_kb=$(sum_kb)

echo ""
echo "Removing dependency and build artifacts..."
for dir in "${TARGETS[@]}"; do
  if [ -e "$dir" ]; then
    rm -rf "$dir"
    echo "Removed: $dir"
  else
    echo "Skipped (missing): $dir"
  fi
done

after_kb=$(sum_kb)
freed_kb=$((before_kb - after_kb))

echo ""
echo "Disk usage after cleanup:"
for dir in "${TARGETS[@]}"; do
  if [ -e "$dir" ]; then
    du -sh "$dir"
  else
    echo "0B $dir (not present)"
  fi
done

echo ""
echo "Summary:"
echo "Before: $(human_mb "$before_kb")"
echo "After:  $(human_mb "$after_kb")"
echo "Freed:  $(human_mb "$freed_kb")"
