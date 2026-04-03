# Kalendrio MCP Specification

## Purpose

Kalendrio MCP gives agent runtimes a stable, task-oriented interface for:

- discovering public booking pages
- listing available dates and time slots
- creating bookings
- inspecting and managing bookings for authenticated hosts
- inspecting event types and connected calendars

The goal is to let agents operate Kalendrio safely without reverse-engineering browser behavior.

## Transport

- V1 transport: stdio
- Hosted transport: Streamable HTTP for hosted remote MCP

## Auth modes

### Public mode
No auth required.

Applies to:
- `get_public_event_type`
- `list_available_dates`
- `list_time_slots`
- `explain_availability`
- `create_booking`

### Authenticated host mode
Requires one of:
- `KALENDRIO_BEARER_TOKEN`
- `KALENDRIO_SESSION_COOKIE`

Hosted HTTP clients may also pass:
- `Authorization: Bearer <kalendrio_agent_token>`
- `Cookie: session=<kalendrio_session_cookie>`

Applies to:
- `get_authenticated_profile`
- `list_bookings`
- `get_booking`
- `cancel_booking`
- `reschedule_booking`
- `list_event_types`
- `create_event_type`
- `list_connected_calendars`

## Tool inventory

### `get_public_event_type`
Purpose: load the public event type definition and host profile for `username/slug`.

Input:
```json
{
  "username": "sarah",
  "slug": "enterprise-demo"
}
```

Output shape:
```json
{
  "eventType": {
    "id": "evt_123",
    "title": "Enterprise Demo",
    "description": "45-minute guided walkthrough",
    "duration": 45,
    "locationType": "google_meet",
    "customQuestions": []
  },
  "host": {
    "name": "Sarah Chen",
    "timezone": "America/New_York"
  }
}
```

### `list_available_dates`
Purpose: list dates in a given month that still have availability.

Input:
```json
{
  "username": "sarah",
  "slug": "enterprise-demo",
  "month": 3,
  "year": 2026,
  "timezone": "Asia/Singapore"
}
```

Output shape:
```json
{
  "eventType": {
    "id": "evt_123",
    "title": "Enterprise Demo"
  },
  "availableDates": ["2026-04-07", "2026-04-08"],
  "timezone": "Asia/Singapore"
}
```

### `list_time_slots`
Purpose: list exact bookable slots for a given date.

Input:
```json
{
  "username": "sarah",
  "slug": "enterprise-demo",
  "date": "2026-04-07",
  "timezone": "Asia/Singapore"
}
```

Output shape:
```json
{
  "eventType": {
    "id": "evt_123",
    "title": "Enterprise Demo"
  },
  "host": {
    "name": "Sarah Chen"
  },
  "timezone": "Asia/Singapore",
  "date": "2026-04-07",
  "timeSlots": [
    {
      "time": "2026-04-07T01:00:00.000Z",
      "endTime": "2026-04-07T01:45:00.000Z"
    }
  ]
}
```

### `create_booking`
Purpose: create a booking for a selected slot.

Input:
```json
{
  "eventTypeId": "evt_123",
  "startTime": "2026-04-07T01:00:00.000Z",
  "timezone": "Asia/Singapore",
  "inviteeName": "Alex Rivera",
  "inviteeEmail": "alex@example.com",
  "inviteeCompany": "Acme",
  "inviteeNotes": "Interested in enterprise routing",
  "source": "mcp"
}
```

### `explain_availability`
Purpose: explain whether a given date is bookable and what the agent should do next.

Input:
```json
{
  "username": "sarah",
  "slug": "enterprise-demo",
  "date": "2026-04-07",
  "timezone": "Asia/Singapore"
}
```

Output shape:
```json
{
  "date": "2026-04-07",
  "timezone": "Asia/Singapore",
  "timeSlots": [],
  "availableDates": ["2026-04-08", "2026-04-09"],
  "explanation": {
    "status": "unavailable",
    "reason": "date_not_bookable",
    "suggestedNextAction": "Pick another date from availableDates and retry."
  }
}
```

Output shape:
```json
{
  "booking": {
    "id": "booking_123",
    "uid": "9da4...",
    "startTime": "2026-04-07T01:00:00.000Z",
    "endTime": "2026-04-07T01:45:00.000Z",
    "status": "confirmed",
    "cancelToken": "...",
    "rescheduleToken": "..."
  }
}
```

### `list_bookings`
Purpose: list the authenticated host's bookings.

Input:
```json
{
  "status": "confirmed",
  "period": "upcoming"
}
```

### `get_authenticated_profile`
Purpose: confirm which Kalendrio user and organization the current authenticated MCP session is operating as.

Input:
```json
{}
```

Output shape:
```json
{
  "user": {
    "id": "user_123",
    "email": "sarah@example.com",
    "name": "Sarah Chen"
  },
  "organization": {
    "id": "org_123",
    "name": "Kalendrio"
  }
}
```

Output shape:
```json
{
  "bookings": [
    {
      "uid": "9da4...",
      "startTime": "2026-04-07T01:00:00.000Z",
      "status": "confirmed",
      "eventType": {
        "title": "Enterprise Demo",
        "duration": 45
      }
    }
  ]
}
```

### `get_booking`
Purpose: fetch one booking by UID.

Input:
```json
{
  "uid": "9da4..."
}
```

### `cancel_booking`
Purpose: cancel a booking as the host.

Input:
```json
{
  "uid": "9da4...",
  "reason": "Prospect requested a later date"
}
```

### `reschedule_booking`
Purpose: mark a booking as rescheduled and let the workflow create a replacement booking.

Input:
```json
{
  "uid": "9da4...",
  "newStartTime": "2026-04-08T03:00:00.000Z"
}
```

### `list_event_types`
Purpose: list active event types for the authenticated host.

Input:
```json
{}
```

### `create_event_type`
Purpose: create a new event type.

Input:
```json
{
  "title": "Founder Intro",
  "slug": "founder-intro",
  "description": "High-intent founder call",
  "duration": 30,
  "locationType": "google_meet",
  "eventTypeKind": "one_on_one",
  "minNotice": 120,
  "maxFutureDays": 30
}
```

### `list_connected_calendars`
Purpose: inspect connected calendars and sync settings.

Input:
```json
{}
```

## Resources

### `kalendrio://capabilities`
A compact machine-readable description of the server’s public and authenticated tools.

### `kalendrio://event-types/{username}/{slug}`
A resource view of a public event type snapshot.

## Prompt

### `book-with-kalendrio`
A reusable prompt that guides a model to:
- inspect the event type first
- look up dates or time slots
- avoid booking until all invitee details are known

## Error design

Current V1 behavior returns friendly tool errors based on upstream HTTP failures.

Recommended next step:
- normalize errors into typed categories such as `unauthorized`, `calendar_conflict`, `slot_unavailable`, `validation_error`, and `not_found`
- include a suggested next action where possible

Current typed MCP errors include:
- `unauthorized`
- `forbidden`
- `validation_error`
- `not_found`
- `calendar_conflict`
- `slot_unavailable`
- `booking_limit_reached`
- `collective_unavailable`
- `server_error`

## Product positioning

Kalendrio MCP is not just calendar access. It is the agent-facing scheduling control plane for Kalendrio.

That means agents can reason about availability, execute bookings, manage follow-through, and integrate scheduling into broader sales or operations workflows.

## Scope enforcement

Agent bearer tokens can now be restricted by scope.

Recognized route-level scopes include:
- `profile:read`
- `bookings:read`
- `bookings:write`
- `event-types:read`
- `event-types:write`
- `calendars:read`
- `calendars:write`
- `tokens:read`
- `tokens:write`

Broad grants also work:
- `read`
- `write`
- `namespace:*`
- `*`
