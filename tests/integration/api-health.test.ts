import { describe, it, expect } from 'vitest';

describe('API health check', () => {
  // Import the route handler directly to test without a running server
  it('health endpoint module exports GET handler', async () => {
    const mod = await import('@/app/api/health/route');
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe('function');
  });
});
