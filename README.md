# kalendr.io - Scheduling Platform for Inbound Sales Teams

A production-ready Calendly-style scheduling application positioned for B2B inbound sales teams. Book more qualified demos, route leads to the right rep, and eliminate scheduling friction.

## Quick Start

```bash
# Install dependencies
npm install

# Seed demo data
npm run db:seed

# Start development server
npm run dev

# Open http://localhost:3000
```

### Demo Login
- **Email:** sarah@acme.com
- **Password:** password123

### Demo Pages
- **Landing Page:** http://localhost:3000/landing
- **Dashboard:** http://localhost:3000/dashboard
- **Booking Page:** http://localhost:3000/sarah-chen/book-a-demo
- **User Profile:** http://localhost:3000/sarah-chen
- **Routing Form:** http://localhost:3000/route/inbound-lead-qualification

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react
- **Auth:** bcryptjs + JWT + HTTP-only cookies
- **Database:** JSON-file persistence (production-ready schema, swap to Postgres)
- **Email:** nodemailer (SMTP abstraction)

## Project Structure

```
src/
  app/
    api/                    # 24 API route handlers
      auth/                 # signup, login, logout, me, password-reset, onboarding
      event-types/          # CRUD + duplicate
      availability/         # CRUD for schedules and rules
      bookings/             # CRUD + cancel/reschedule
      scheduling/           # Public booking page API
      routing-forms/        # CRUD + submit + by-slug
      team/                 # Teams + members
      user/                 # Settings
      integrations/         # Calendar OAuth scaffolding
      embed/                # Embed code generator
    dashboard/              # 10 authenticated dashboard pages
      event-types/          # Manage event types
      bookings/             # View/manage bookings
      availability/         # Set weekly hours
      routing/              # Create routing forms
      team/                 # Team management
      integrations/         # Connected services
      settings/             # Profile settings
      billing/              # Plan management
      workflows/            # Email automation
      embed/                # Embed code generator
    [username]/             # Public user profile
    [username]/[slug]/      # Public booking page
    booking/[uid]/          # Cancel/reschedule pages
    route/[slug]/           # Public routing form
    embed/                  # Embeddable booking page
    landing/                # Marketing landing page
    login/                  # Auth pages
    signup/
    onboarding/
  components/
    ui/                     # Reusable UI components
    layout/                 # App shell, auth layout
  lib/
    db.ts                   # Database abstraction layer
    auth.ts                 # Authentication helpers
    email.ts                # Email service + templates
    availability.ts         # Scheduling engine
    types.ts                # TypeScript interfaces
data/                       # JSON data files (dev database)
scripts/
  seed.js                   # Demo data seeder
prisma/
  schema.prisma             # Full Postgres schema (reference)
```

## Environment Variables

```env
# Required
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret-min-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="KalendR"
DATA_DIR="./data"

# Email (optional for dev - logs to console)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="KalendR <noreply@kalendr.io>"

# Calendar OAuth (optional - enables real calendar sync)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""

# Stripe (optional - enables billing)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_STANDARD_PRICE_ID=""
STRIPE_TEAMS_PRICE_ID=""

# Zoom (optional)
ZOOM_CLIENT_ID=""
ZOOM_CLIENT_SECRET=""
```

## Features Implemented

### Core Scheduling
- Event types (one-on-one, group, round-robin, collective)
- Weekly availability schedules with day/time configuration
- Date-specific overrides
- Buffer times (before/after meetings)
- Minimum scheduling notice
- Maximum future booking days
- Daily booking limits
- Slot interval controls
- Timezone-aware scheduling
- Conflict detection (prevents double-booking)

### Booking Flow
- Public booking pages (Calendly-style calendar + time slots + form)
- User profile pages showing all active event types
- Custom invitee questions (text, select, textarea, phone)
- Booking confirmation page
- Cancel/reschedule flows with tokens
- Email notifications (confirmation, host notification, cancellation)

### Team Scheduling
- Round-robin assignment (equal distribution or availability-optimized)
- Collective events (all hosts must be available)
- Host priority settings
- Team creation and member management
- Organization-level user management

### Routing Forms
- Custom qualification fields
- Conditional routing rules (equals, not_equals, contains)
- Route to event type, external URL, or message
- Fallback routing behavior
- Public routing form pages

### Authentication
- Email/password signup and login
- Session management with HTTP-only cookies
- Password reset flow with email tokens
- Multi-step onboarding
- Account settings (name, timezone, slug, bio)

### SaaS Features
- Organization and workspace model
- Role-based access (owner, admin, member)
- Billing page with 4-tier pricing (Free, Standard, Teams, Enterprise)
- Stripe integration scaffolding
- Team invitation (stubbed)

### Embed & Share
- 3 embed types: inline, popup widget, popup text link
- Embed code generator with copy-to-clipboard
- Shareable direct links
- Embeddable booking page (iframe-friendly)

### Email System
- Booking confirmation emails (invitee + host)
- Cancellation notifications
- Reminder email templates
- Password reset emails
- Console logging in development mode

### Dashboard
- Home with stats and upcoming bookings
- Event types management (create, edit, duplicate, archive, toggle)
- Bookings list (upcoming/past tabs)
- Availability schedule editor
- Routing forms builder
- Team management
- Integrations hub (8 providers)
- Settings page
- Billing page
- Workflows page
- Embed page

### Landing Page
- Sales-focused positioning
- Feature grid, how-it-works, pricing section
- Professional footer

## What's Stubbed / Partial

1. **Calendar OAuth** - Architecture ready, needs Google/Microsoft credentials
2. **Real calendar sync** - Conflict checking uses internal bookings only
3. **Stripe billing** - UI complete, needs Stripe API keys
4. **Team invitations** - UI built, email sending stubbed
5. **SMS notifications** - Schema ready, not implemented
6. **Zoom/Google Meet** - Generates placeholder links, needs OAuth
7. **CRM integrations** - Listed in UI, not connected
8. **Webhook/API** - No public API yet
9. **SSO/SAML** - Enterprise feature, not implemented
10. **Database** - Uses JSON files; Prisma schema included for Postgres migration

## Production Deployment

### Render (current file-based DB)

1. Use the included [render.yaml](/Users/0xpyre/KalendR/render.yaml).
2. Ensure a **Persistent Disk** is attached (already defined in `render.yaml`).
3. Keep `DATA_DIR` on the mounted disk (`/var/data/kalendr-data`).
4. Run exactly:
   `buildCommand: npm install && npm run build`
   `startCommand: npm run start`
5. Do **not** run `npm run db:seed` in production deploy hooks.
6. Scale web service to **1 instance** when using file-based storage.

### Important Notes

- Current runtime persistence is JSON files in `DATA_DIR`.
- Production data loss happens if filesystem is ephemeral or if seed script runs.
- The seed script is now blocked in production unless `ALLOW_PRODUCTION_SEED=true`.

### Future Upgrade (recommended)

1. Move runtime storage from JSON files to PostgreSQL.
2. Apply Prisma migrations with `npx prisma migrate deploy`.
3. Remove file-based `DATA_DIR` dependency.
