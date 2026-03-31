#!/bin/bash
# Push KalendR to GitHub
# Run: bash push-to-github.sh

set -e

# Clean up any stale lock files
find .git -name "*.lock" -delete 2>/dev/null || true

# Remove broken git if exists and reinitialize
rm -rf .git

# Initialize fresh repo
git init
git checkout -b main
git add -A
git commit -m "Initial commit: KalendR scheduling platform for inbound sales teams"
git remote add origin https://github.com/systemprometheus/KalendR.git
git push -u origin main

echo ""
echo "✅ Successfully pushed to https://github.com/systemprometheus/KalendR"
echo "You can delete this script now: rm push-to-github.sh"
