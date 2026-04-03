import { z } from 'zod';
import { formatJsonResult, formatToolError } from '../lib/tool-utils.js';
export function registerPublicTools(server, client) {
    server.registerTool('get_public_event_type', {
        title: 'Get Public Event Type',
        description: 'Fetch the public booking page details for a Kalendrio host and event type slug.',
        inputSchema: {
            username: z.string().min(1),
            slug: z.string().min(1),
        },
    }, async ({ username, slug }) => {
        try {
            const response = await client.getPublicEventType(username, slug);
            return formatJsonResult(response, `Loaded ${username}/${slug} from Kalendrio.`);
        }
        catch (error) {
            return formatToolError(error, 'Unable to load the public event type.');
        }
    });
    server.registerTool('list_available_dates', {
        title: 'List Available Dates',
        description: 'Return the dates in a month that still have bookable capacity for a Kalendrio event type.',
        inputSchema: {
            username: z.string().min(1),
            slug: z.string().min(1),
            month: z.number().int().min(0).max(11),
            year: z.number().int().min(2024).max(2100),
            timezone: z.string().default('UTC'),
        },
    }, async ({ username, slug, month, year, timezone }) => {
        try {
            const response = await client.listAvailableDates({ username, slug, month, year, timezone });
            return formatJsonResult({
                eventType: response.eventType,
                availableDates: response.availableDates ?? [],
                timezone,
            });
        }
        catch (error) {
            return formatToolError(error, 'Unable to list available dates.');
        }
    });
    server.registerTool('list_time_slots', {
        title: 'List Time Slots',
        description: 'Return bookable time slots for a specific Kalendrio event type on a given date.',
        inputSchema: {
            username: z.string().min(1),
            slug: z.string().min(1),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            timezone: z.string().default('UTC'),
        },
    }, async ({ username, slug, date, timezone }) => {
        try {
            const response = await client.listTimeSlots({ username, slug, date, timezone });
            return formatJsonResult({
                eventType: response.eventType,
                host: response.host,
                timezone,
                date,
                timeSlots: response.timeSlots ?? [],
            });
        }
        catch (error) {
            return formatToolError(error, 'Unable to list time slots.');
        }
    });
    server.registerTool('create_booking', {
        title: 'Create Booking',
        description: 'Create a Kalendrio booking for a public event type after choosing an open slot.',
        inputSchema: {
            eventTypeId: z.string().min(1),
            startTime: z.string().datetime(),
            timezone: z.string().default('UTC'),
            inviteeName: z.string().min(1),
            inviteeEmail: z.string().email(),
            inviteePhone: z.string().optional(),
            inviteeCompany: z.string().optional(),
            inviteeJobTitle: z.string().optional(),
            inviteeNotes: z.string().optional(),
            source: z.string().default('mcp'),
            customResponses: z.record(z.string(), z.string()).optional(),
        },
    }, async (input) => {
        try {
            const response = await client.createBooking(input);
            return formatJsonResult(response, 'Booking created in Kalendrio.');
        }
        catch (error) {
            return formatToolError(error, 'Unable to create booking.');
        }
    });
    server.registerTool('explain_availability', {
        title: 'Explain Availability',
        description: 'Explain whether a Kalendrio event type has bookable time on a given date and provide the next best action.',
        inputSchema: {
            username: z.string().min(1),
            slug: z.string().min(1),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            timezone: z.string().default('UTC'),
        },
    }, async ({ username, slug, date, timezone }) => {
        try {
            const eventTypeResponse = await client.getPublicEventType(username, slug);
            const slotsResponse = await client.listTimeSlots({ username, slug, date, timezone });
            const month = Number(date.slice(5, 7)) - 1;
            const year = Number(date.slice(0, 4));
            const datesResponse = await client.listAvailableDates({ username, slug, month, year, timezone });
            const timeSlots = slotsResponse.timeSlots ?? [];
            const availableDates = datesResponse.availableDates ?? [];
            const isDateBookable = availableDates.includes(date);
            const explanation = timeSlots.length > 0
                ? {
                    status: 'available',
                    reason: 'bookable_slots_found',
                    suggestedNextAction: 'Pick one of the returned slots and call create_booking.',
                }
                : {
                    status: 'unavailable',
                    reason: isDateBookable ? 'slots_exhausted_or_temporarily_blocked' : 'date_not_bookable',
                    suggestedNextAction: isDateBookable
                        ? 'Refresh time slots or choose another slot on the same date.'
                        : 'Pick another date from availableDates and retry.',
                };
            return formatJsonResult({
                eventType: eventTypeResponse.eventType,
                host: eventTypeResponse.host,
                date,
                timezone,
                availableDates,
                timeSlots,
                explanation,
            });
        }
        catch (error) {
            return formatToolError(error, 'Unable to explain availability.');
        }
    });
}
