# Kalendrio MCP Server

Kalendrio MCP turns `kalendrio` into an agent-native scheduling control plane. Instead of teaching an agent your REST API, cookies, and booking rules, you give it a clean tool surface for availability lookup, booking, booking management, event type management, and calendar inspection.

## Why this exists

Kalendrio already has strong scheduling primitives:

- public scheduling discovery
- booking creation
- booking inspection and management
- event type management
- connected calendar sync
- conflict detection and slot generation

The MCP server wraps those primitives in a format agents can use reliably.

For the detailed tool-by-tool contract, see `SPEC.md`.

## What agents can do

### Public scheduling flows
- inspect a public event type with `get_public_event_type`
- find valid booking dates with `list_available_dates`
- list actual bookable slots with `list_time_slots`
- explain whether a date is realistically bookable with `explain_availability`
- create a booking with `create_booking`

### Authenticated host flows
- list upcoming or past bookings with `list_bookings`
- inspect a specific booking with `get_booking`
- cancel or reschedule a booking with `cancel_booking` and `reschedule_booking`
- list or create event types with `list_event_types` and `create_event_type`
- inspect connected calendars with `list_connected_calendars`

## Tool design philosophy

This server is intentionally task-oriented rather than database-oriented.

Good tools:
- `list_time_slots`
- `create_booking`
- `cancel_booking`

Bad tools:
- `insert_booking_row`
- `query_internal_schedule_table`

Agents perform better when the interface is aligned to outcomes.

## Architecture

### Transport
Kalendrio MCP now supports both:

- stdio for local MCP clients such as Codex and Claude Desktop
- Streamable HTTP for hosted MCP deployments and remote clients

### Integration boundary
The server talks to Kalendrio through HTTP against the existing app routes.

Benefits:
- fast to ship
- consistent with current product behavior
- easy to run against local or hosted environments

Tradeoff:
- authenticated tools depend on Kalendrio auth reaching those routes

## Authentication

### Public tools
These work without auth.

### Authenticated tools
Set one of these environment variables:

- `KALENDRIO_BEARER_TOKEN`: preferred for agent use
- `KALENDRIO_SESSION_COOKIE`: still supported for browser-session-based local usage

### Scope model
Agent tokens can be scoped. Current route checks recognize:

- `profile:read`
- `bookings:read`
- `bookings:write`
- `event-types:read`
- `event-types:write`
- `calendars:read`
- `calendars:write`
- `tokens:read`
- `tokens:write`

The auth layer also recognizes broader grants like `read`, `write`, `namespace:*`, and `*`.

### Minting an agent token
Use a browser session or login cookie once, then create a long-lived bearer token:

```bash
curl -X POST http://127.0.0.1:3010/api/auth/agent-tokens \
  -H "cookie: session=YOUR_SESSION_COOKIE" \
  -H "content-type: application/json" \
  -d '{"name":"Kalendrio MCP","expiresInDays":30,"scopes":["bookings:read","bookings:write","event-types:read","calendars:read"]}'
```

The response includes a raw bearer token once. Store it in `KALENDRIO_BEARER_TOKEN`.

## Environment

Copy `.env.example` and set:

```bash
KALENDRIO_BASE_URL=http://localhost:3000
KALENDRIO_SESSION_COOKIE=
KALENDRIO_BEARER_TOKEN=
KALENDRIO_USER_AGENT=kalendrio-mcp/0.1.0
```

## Run locally

```bash
cd mcp/kalendrio-mcp
npm install
npm run dev
```

## Run hosted HTTP locally

```bash
cd mcp/kalendrio-mcp
KALENDRIO_BASE_URL=http://127.0.0.1:3010 \
MCP_PORT=3210 \
npm run dev:http
```

Endpoints:
- `GET /health`
- `POST /mcp`
- `GET /mcp`
- `DELETE /mcp`

## Smoke test the full flow

Start Kalendrio locally, mint an agent token, then run:

```bash
cd mcp/kalendrio-mcp
KALENDRIO_BASE_URL=http://127.0.0.1:3010 \
KALENDRIO_BEARER_TOKEN=your_agent_token \
npm run smoke
```

The smoke test uses a real MCP stdio client to:
- connect to the server
- inspect tools
- fetch availability
- create a booking
- list authenticated host data
- cancel the booking for cleanup

## Smoke test hosted HTTP

With the HTTP server running:

```bash
cd mcp/kalendrio-mcp
KALENDRIO_MCP_URL=http://127.0.0.1:3210/mcp \
KALENDRIO_BEARER_TOKEN=your_agent_token \
npm run smoke:http
```

## Build

```bash
cd mcp/kalendrio-mcp
npm run build
npm run start
```

## Example MCP client config

```json
{
  "mcpServers": {
    "kalendrio": {
      "command": "npm",
      "args": ["run", "dev", "--prefix", "/Users/0xpyre/KalendR/mcp/kalendrio-mcp"],
      "env": {
        "KALENDRIO_BASE_URL": "http://localhost:3000",
        "KALENDRIO_BEARER_TOKEN": "your_agent_token_here"
      }
    }
  }
}
```

## Example agent workflows

### Book a demo for a lead
1. `get_public_event_type`
2. `list_available_dates`
3. `list_time_slots`
4. `create_booking`

### Triage a founder calendar
1. `list_bookings`
2. `get_booking`
3. `cancel_booking` or `reschedule_booking`
4. `list_connected_calendars`

### Provision a new booking page
1. `create_event_type`
2. `list_event_types`
3. share the generated slug through Kalendrio

## Current implementation notes

This package is now production-shaped, but a few follow-ups would strengthen it further:

- normalize HTTP errors into richer MCP tool errors with typed reasons like `calendar_conflict`
- add host-scoped filtering and pagination to list tools as the product grows
- add richer scope enforcement on agent tokens
- add persistent session or resumability support if long-lived hosted MCP sessions become important

## Recommended next iteration

The best next step is to move shared scheduling logic into a service layer that both Next routes and the MCP package can call. That keeps the app and the MCP aligned while reducing route-coupling over time.
