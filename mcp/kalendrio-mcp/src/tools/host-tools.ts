import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KalendrioClient } from '../lib/kalendrio-client.js';
import { formatJsonResult, formatToolError } from '../lib/tool-utils.js';

export function registerHostTools(server: McpServer, client: KalendrioClient) {
  server.registerTool(
    'get_authenticated_profile',
    {
      title: 'Get Authenticated Profile',
      description: 'Show which Kalendrio user and organization the authenticated MCP session is operating as.',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await client.getCurrentProfile();
        return formatJsonResult(response, 'Loaded authenticated Kalendrio profile.');
      } catch (error) {
        return formatToolError(error, 'Unable to load the authenticated profile.');
      }
    },
  );

  server.registerTool(
    'list_bookings',
    {
      title: 'List Bookings',
      description: 'List the authenticated host\'s Kalendrio bookings.',
      inputSchema: {
        status: z.enum(['confirmed', 'pending', 'cancelled', 'rescheduled']).optional(),
        period: z.enum(['upcoming', 'past']).optional(),
      },
    },
    async ({ status, period }) => {
      try {
        const response = await client.listBookings({ status, period });
        return formatJsonResult(response, 'Loaded Kalendrio bookings.');
      } catch (error) {
        return formatToolError(error, 'Unable to list bookings.');
      }
    },
  );

  server.registerTool(
    'get_booking',
    {
      title: 'Get Booking',
      description: 'Fetch one booking by Kalendrio booking UID.',
      inputSchema: {
        uid: z.string().min(1),
      },
    },
    async ({ uid }) => {
      try {
        const response = await client.getBooking(uid);
        return formatJsonResult(response, `Loaded booking ${uid}.`);
      } catch (error) {
        return formatToolError(error, 'Unable to load the booking.');
      }
    },
  );

  server.registerTool(
    'cancel_booking',
    {
      title: 'Cancel Booking',
      description: 'Cancel a booking as the authenticated Kalendrio host.',
      inputSchema: {
        uid: z.string().min(1),
        reason: z.string().optional(),
      },
    },
    async ({ uid, reason }) => {
      try {
        const response = await client.cancelBooking(uid, reason);
        return formatJsonResult(response, `Cancelled booking ${uid}.`);
      } catch (error) {
        return formatToolError(error, 'Unable to cancel the booking.');
      }
    },
  );

  server.registerTool(
    'reschedule_booking',
    {
      title: 'Reschedule Booking',
      description: 'Mark a booking as rescheduled so the workflow can create a replacement booking.',
      inputSchema: {
        uid: z.string().min(1),
        newStartTime: z.string().datetime(),
      },
    },
    async ({ uid, newStartTime }) => {
      try {
        const response = await client.rescheduleBooking(uid, newStartTime);
        return formatJsonResult(response, `Marked booking ${uid} as rescheduled.`);
      } catch (error) {
        return formatToolError(error, 'Unable to reschedule the booking.');
      }
    },
  );

  server.registerTool(
    'list_event_types',
    {
      title: 'List Event Types',
      description: 'List the authenticated host\'s active Kalendrio event types.',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await client.listEventTypes();
        return formatJsonResult(response, 'Loaded Kalendrio event types.');
      } catch (error) {
        return formatToolError(error, 'Unable to list event types.');
      }
    },
  );

  server.registerTool(
    'create_event_type',
    {
      title: 'Create Event Type',
      description: 'Create a new Kalendrio event type for the authenticated host.',
      inputSchema: {
        title: z.string().min(1),
        slug: z.string().optional(),
        description: z.string().optional(),
        duration: z.number().int().positive().default(30),
        locationType: z.enum(['google_meet', 'zoom', 'phone', 'in_person', 'custom']).default('google_meet'),
        locationValue: z.string().optional(),
        color: z.string().optional(),
        eventTypeKind: z.enum(['one_on_one', 'round_robin', 'collective']).default('one_on_one'),
        minNotice: z.number().int().nonnegative().optional(),
        maxFutureDays: z.number().int().positive().optional(),
        slotInterval: z.number().int().positive().optional(),
        bufferBefore: z.number().int().nonnegative().optional(),
        bufferAfter: z.number().int().nonnegative().optional(),
        dailyLimit: z.number().int().positive().optional(),
        weeklyLimit: z.number().int().positive().optional(),
        requiresConfirmation: z.boolean().optional(),
      },
    },
    async (input) => {
      try {
        const response = await client.createEventType(input);
        return formatJsonResult(response, `Created Kalendrio event type ${input.title}.`);
      } catch (error) {
        return formatToolError(error, 'Unable to create the event type.');
      }
    },
  );

  server.registerTool(
    'list_connected_calendars',
    {
      title: 'List Connected Calendars',
      description: 'List connected calendars and sync settings for the authenticated Kalendrio user.',
      inputSchema: {},
    },
    async () => {
      try {
        const response = await client.listConnectedCalendars();
        return formatJsonResult(response, 'Loaded connected calendars.');
      } catch (error) {
        return formatToolError(error, 'Unable to list connected calendars.');
      }
    },
  );
}
