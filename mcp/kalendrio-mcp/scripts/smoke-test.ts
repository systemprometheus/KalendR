import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const rootDir = new URL('../', import.meta.url).pathname;
const username = process.env.KALENDRIO_TEST_USERNAME || 'sarah-chen';
const slug = process.env.KALENDRIO_TEST_SLUG || 'book-a-demo';
const timezone = process.env.KALENDRIO_TEST_TIMEZONE || 'Asia/Singapore';
const bearerToken = process.env.KALENDRIO_BEARER_TOKEN;
const baseUrl = process.env.KALENDRIO_BASE_URL || 'http://127.0.0.1:3010';

if (!bearerToken) {
  console.error('KALENDRIO_BEARER_TOKEN is required for the smoke test.');
  process.exit(1);
}

async function main() {
  const client = new Client(
    { name: 'kalendrio-smoke-test', version: '0.1.0' },
    { capabilities: {} },
  );

  const transport = new StdioClientTransport({
    command: 'npm',
    args: ['run', 'dev'],
    cwd: rootDir,
    env: {
      ...process.env,
      KALENDRIO_BASE_URL: baseUrl,
      KALENDRIO_BEARER_TOKEN: bearerToken,
    } as Record<string, string>,
    stderr: 'inherit',
  });

  await client.connect(transport);

  const toolsResult = await client.listTools();
  console.log('Available tools:', toolsResult.tools.map((tool) => tool.name).join(', '));

  const eventType = await client.callTool({
    name: 'get_public_event_type',
    arguments: { username, slug },
  });
  console.log('Loaded event type.');

  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const datesResult = await client.callTool({
    name: 'list_available_dates',
    arguments: { username, slug, month, year, timezone },
  });

  const availableDates = readStructured<Array<string>>(datesResult, 'availableDates');
  if (!availableDates.length) {
    throw new Error('Smoke test could not find any available dates.');
  }

  const date = availableDates[0];
  console.log('Using date:', date);

  const explainResult = await client.callTool({
    name: 'explain_availability',
    arguments: { username, slug, date, timezone },
  });
  console.log('Availability explanation:', JSON.stringify(explainResult.structuredContent, null, 2));

  const slotsResult = await client.callTool({
    name: 'list_time_slots',
    arguments: { username, slug, date, timezone },
  });
  const timeSlots = readStructured<Array<{ time: string; endTime: string }>>(slotsResult, 'timeSlots');
  if (!timeSlots.length) {
    throw new Error('Smoke test could not find any available slots.');
  }

  const chosenSlot = timeSlots[0];
  const inviteeEmail = `mcp-smoke-${Date.now()}@example.com`;
  const bookingResult = await client.callTool({
    name: 'create_booking',
    arguments: {
      eventTypeId: readStructured<string>(eventType, 'eventType.id'),
      startTime: chosenSlot.time,
      timezone,
      inviteeName: 'MCP Smoke Test',
      inviteeEmail,
      inviteeCompany: 'Kalendrio QA',
      inviteeNotes: 'Created by the Kalendrio MCP smoke test.',
      source: 'mcp_smoke_test',
    },
  });

  const bookingUid = readStructured<string>(bookingResult, 'booking.uid');
  console.log('Created booking:', bookingUid);

  await client.callTool({ name: 'list_event_types', arguments: {} });
  await client.callTool({ name: 'list_bookings', arguments: { period: 'upcoming' } });
  await client.callTool({ name: 'cancel_booking', arguments: { uid: bookingUid, reason: 'Smoke test cleanup' } });
  console.log('Cancelled booking:', bookingUid);

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
  console.error('Smoke test failed:', error);
  process.exit(1);
});
