import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const username = process.env.KALENDRIO_TEST_USERNAME || 'sarah-chen';
const slug = process.env.KALENDRIO_TEST_SLUG || 'book-a-demo';
const timezone = process.env.KALENDRIO_TEST_TIMEZONE || 'Asia/Singapore';
const bearerToken = process.env.KALENDRIO_BEARER_TOKEN;
const mcpUrl = process.env.KALENDRIO_MCP_URL || 'http://127.0.0.1:3100/mcp';

if (!bearerToken) {
  console.error('KALENDRIO_BEARER_TOKEN is required for the HTTP smoke test.');
  process.exit(1);
}

async function main() {
  const client = new Client(
    { name: 'kalendrio-http-smoke-test', version: '0.1.0' },
    { capabilities: {} },
  );

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
  });

  await client.connect(transport);
  const toolsResult = await client.listTools();
  console.log('Available tools over HTTP:', toolsResult.tools.map((tool) => tool.name).join(', '));

  const now = new Date();
  const datesResult = await client.callTool({
    name: 'list_available_dates',
    arguments: {
      username,
      slug,
      month: now.getUTCMonth(),
      year: now.getUTCFullYear(),
      timezone,
    },
  });

  const availableDates = readStructured<Array<string>>(datesResult, 'availableDates');
  if (!availableDates.length) {
    throw new Error('HTTP smoke test could not find any available dates.');
  }

  const eventTypeResult = await client.callTool({
    name: 'get_public_event_type',
    arguments: { username, slug },
  });

  const slotsResult = await client.callTool({
    name: 'list_time_slots',
    arguments: {
      username,
      slug,
      date: availableDates[0],
      timezone,
    },
  });

  const timeSlots = readStructured<Array<{ time: string }>>(slotsResult, 'timeSlots');
  if (!timeSlots.length) {
    throw new Error('HTTP smoke test could not find any available slots.');
  }

  const bookingResult = await client.callTool({
    name: 'create_booking',
    arguments: {
      eventTypeId: readStructured<string>(eventTypeResult, 'eventType.id'),
      startTime: timeSlots[0].time,
      timezone,
      inviteeName: 'MCP HTTP Smoke Test',
      inviteeEmail: `mcp-http-${Date.now()}@example.com`,
      source: 'mcp_http_smoke_test',
    },
  });

  const bookingUid = readStructured<string>(bookingResult, 'booking.uid');
  console.log('Created booking over HTTP:', bookingUid);

  await client.callTool({ name: 'list_bookings', arguments: { period: 'upcoming' } });
  await client.callTool({ name: 'cancel_booking', arguments: { uid: bookingUid, reason: 'HTTP smoke test cleanup' } });
  console.log('Cancelled booking over HTTP:', bookingUid);

  await transport.close();
}

function readStructured<T>(result: { structuredContent?: unknown }, path: string): T {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, result.structuredContent);

  if (value === undefined) {
    throw new Error(`Missing structuredContent path: ${path}`);
  }

  return value as T;
}

main().catch((error) => {
  console.error('HTTP smoke test failed:', error);
  process.exit(1);
});
