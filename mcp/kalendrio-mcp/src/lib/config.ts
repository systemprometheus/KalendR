import { z } from 'zod';

const configSchema = z.object({
  KALENDRIO_BASE_URL: z.string().url().default('http://localhost:3000'),
  KALENDRIO_SESSION_COOKIE: z.string().optional(),
  KALENDRIO_BEARER_TOKEN: z.string().optional(),
  KALENDRIO_USER_AGENT: z.string().default('kalendrio-mcp/0.1.0'),
});

export type KalendrioConfig = z.infer<typeof configSchema>;

export function loadConfig(): KalendrioConfig {
  return configSchema.parse({
    KALENDRIO_BASE_URL: process.env.KALENDRIO_BASE_URL ?? 'http://localhost:3000',
    KALENDRIO_SESSION_COOKIE: process.env.KALENDRIO_SESSION_COOKIE,
    KALENDRIO_BEARER_TOKEN: process.env.KALENDRIO_BEARER_TOKEN,
    KALENDRIO_USER_AGENT: process.env.KALENDRIO_USER_AGENT ?? 'kalendrio-mcp/0.1.0',
  });
}
