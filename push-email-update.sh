#!/bin/bash
# Push the Resend email update to GitHub
cd "$(dirname "$0")"

echo "📧 Pushing email update (Resend integration)..."

git add -A
git commit -m "Switch email service from nodemailer to Resend REST API

- Replace nodemailer SMTP with Resend fetch-based API
- Remove nodemailer and @types/nodemailer dependencies
- Use RESEND_API_KEY env var for authentication
- Fallback to console.log when no API key is set"

git push origin main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully pushed! Render will auto-deploy."
  echo "You can delete this script: rm push-email-update.sh"
else
  echo ""
  echo "❌ Push failed. Try running: git push origin main"
fi
