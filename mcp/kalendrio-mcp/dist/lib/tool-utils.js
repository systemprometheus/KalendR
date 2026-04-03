import { KalendrioApiError } from './kalendrio-client.js';
export function formatJsonResult(data, summary) {
    const formatted = JSON.stringify(data, null, 2);
    return {
        content: [
            {
                type: 'text',
                text: summary ? `${summary}\n\n${formatted}` : formatted,
            },
        ],
        structuredContent: data,
    };
}
export function formatErrorResult(message, details) {
    return {
        content: [
            {
                type: 'text',
                text: details ? `${message}\n\n${JSON.stringify(details, null, 2)}` : message,
            },
        ],
        isError: true,
    };
}
export function formatToolError(error, fallbackMessage) {
    if (error instanceof KalendrioApiError) {
        const structured = {
            error: {
                type: error.name,
                reason: error.reason,
                status: error.status,
                message: error.message,
                suggestedNextAction: error.suggestedNextAction || null,
                details: error.details,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(structured, null, 2),
                },
            ],
            structuredContent: structured,
            isError: true,
        };
    }
    return formatErrorResult(fallbackMessage, error instanceof Error ? error.message : error);
}
