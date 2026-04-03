import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadConfig } from './lib/config.js';
import { createKalendrioMcpServer } from './create-server.js';
import { withKalendrioRequestAuth } from './lib/request-auth.js';
const config = loadConfig();
const port = Number(process.env.MCP_PORT || 3100);
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version');
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString('utf-8').trim();
    if (!raw)
        return undefined;
    return JSON.parse(raw);
}
function readBearerToken(req) {
    const value = req.headers.authorization;
    if (!value)
        return undefined;
    const [scheme, token] = value.trim().split(/\s+/, 2);
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer')
        return undefined;
    return token;
}
function readSessionCookie(req) {
    const value = req.headers.cookie;
    return typeof value === 'string' && value.trim() ? value : undefined;
}
const httpServer = createServer(async (req, res) => {
    setCorsHeaders(res);
    if (!req.url) {
        res.statusCode = 400;
        res.end('Missing URL');
        return;
    }
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }
    if (url.pathname === '/health') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', name: 'kalendrio-mcp', transport: 'streamable-http' }));
        return;
    }
    if (url.pathname !== '/mcp') {
        res.statusCode = 404;
        res.end('Not found');
        return;
    }
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });
        const server = createKalendrioMcpServer(config);
        await server.connect(transport);
        const parsedBody = req.method === 'POST' ? await readJsonBody(req) : undefined;
        await withKalendrioRequestAuth({
            bearerToken: readBearerToken(req),
            sessionCookie: readSessionCookie(req),
        }, async () => {
            await transport.handleRequest(req, res, parsedBody);
        });
    }
    catch (error) {
        console.error('kalendrio-mcp http request failed', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        else {
            res.end();
        }
    }
});
httpServer.listen(port, '0.0.0.0', () => {
    console.log(`kalendrio-mcp http server listening on http://127.0.0.1:${port}`);
    console.log(`health: http://127.0.0.1:${port}/health`);
    console.log(`mcp: http://127.0.0.1:${port}/mcp`);
});
