import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { KalendrioClient } from './lib/kalendrio-client.js';
import { registerPublicTools } from './tools/public-tools.js';
import { registerHostTools } from './tools/host-tools.js';
export function createKalendrioMcpServer(config) {
    const client = new KalendrioClient(config);
    const server = new McpServer({
        name: 'kalendrio-mcp',
        version: '0.1.0',
    }, {
        capabilities: {
            logging: {},
        },
    });
    registerPublicTools(server, client);
    registerHostTools(server, client);
    server.registerResource('kalendrio-capabilities', 'kalendrio://capabilities', {
        title: 'Kalendrio MCP Capabilities',
        description: 'Overview of available scheduling, booking, and calendar operations.',
        mimeType: 'application/json',
    }, async () => ({
        contents: [
            {
                uri: 'kalendrio://capabilities',
                mimeType: 'application/json',
                text: JSON.stringify({
                    server: 'kalendrio-mcp',
                    transport: 'stdio-or-http',
                    baseUrl: config.KALENDRIO_BASE_URL,
                    publicTools: [
                        'get_public_event_type',
                        'list_available_dates',
                        'list_time_slots',
                        'explain_availability',
                        'create_booking',
                    ],
                    authenticatedTools: [
                        'list_bookings',
                        'get_booking',
                        'cancel_booking',
                        'reschedule_booking',
                        'list_event_types',
                        'create_event_type',
                        'list_connected_calendars',
                    ],
                }, null, 2),
            },
        ],
    }));
    server.registerResource('kalendrio-event-type-guide', new ResourceTemplate('kalendrio://event-types/{username}/{slug}', { list: undefined }), {
        title: 'Kalendrio Event Type Snapshot',
        description: 'Inspect a public Kalendrio booking page as a resource.',
        mimeType: 'application/json',
    }, async (_uri, { username, slug }) => {
        const result = await client.getPublicEventType(String(username), String(slug));
        return {
            contents: [
                {
                    uri: `kalendrio://event-types/${username}/${slug}`,
                    mimeType: 'application/json',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    server.registerPrompt('book-with-kalendrio', {
        title: 'Book With Kalendrio',
        description: 'Guide a model through finding a slot and booking it in Kalendrio.',
        argsSchema: {
            username: z.string(),
            slug: z.string(),
            timezone: z.string().default('UTC'),
            date: z.string().optional(),
            bookingGoal: z.string().optional(),
        },
    }, ({ username, slug, timezone, date, bookingGoal }) => ({
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: [
                        `Use Kalendrio to help with booking for ${username}/${slug}.`,
                        `Timezone: ${timezone}.`,
                        date ? `Preferred date: ${date}.` : 'If no date is given, inspect upcoming availability.',
                        bookingGoal ? `Goal: ${bookingGoal}.` : 'Choose the best next action for availability and booking.',
                        'First inspect the public event type, then list dates or time slots, and only create a booking once all required invitee details are known.',
                    ].join(' '),
                },
            },
        ],
    }));
    return server;
}
