import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './lib/config.js';
import { createKalendrioMcpServer } from './create-server.js';

async function main() {
  const config = loadConfig();
  const server = createKalendrioMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('kalendrio-mcp failed to start', error);
  process.exit(1);
});
