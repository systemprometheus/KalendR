import { describe, it, expect, vi } from 'vitest';

// Mock next/headers before importing auth module
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve({ get: () => null })),
}));

import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getJwtSecret,
  generateSlug,
  createOAuthState,
  parseOAuthState,
  DEFAULT_AGENT_TOKEN_SCOPES,
  ALLOWED_AGENT_TOKEN_SCOPES,
  normalizeAgentTokenScopes,
  validateAgentTokenScopes,
} from '@/lib/auth';

describe('auth', () => {
  describe('getJwtSecret', () => {
    it('returns configured JWT_SECRET when set', () => {
      process.env.JWT_SECRET = 'my-custom-secret-that-is-long-enough';
      expect(getJwtSecret()).toBe('my-custom-secret-that-is-long-enough');
    });

    it('returns dev fallback when no JWT_SECRET in non-production', () => {
      delete process.env.JWT_SECRET;
      (process.env as any).NODE_ENV = 'test';
      expect(getJwtSecret()).toBeTruthy();
    });

    it('throws in production without JWT_SECRET', () => {
      const originalSecret = process.env.JWT_SECRET;
      const originalEnv = process.env.NODE_ENV;
      process.env.JWT_SECRET = '';
      (process.env as any).NODE_ENV = 'production';
      expect(() => getJwtSecret()).toThrow('JWT_SECRET must be configured in production');
      process.env.JWT_SECRET = originalSecret;
      (process.env as any).NODE_ENV = originalEnv;
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies a password correctly', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = await hashPassword('correct-password');
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('returns false for malformed stored hashes', async () => {
      expect(await verifyPassword('anything', '')).toBe(false);
      expect(await verifyPassword('anything', 'oauth-only-account')).toBe(false);
    });

    it('produces different hashes for same password (salted)', async () => {
      const hash1 = await hashPassword('same-pass');
      const hash2 = await hashPassword('same-pass');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateToken / verifyToken', () => {
    it('creates a verifiable JWT', () => {
      const token = generateToken({ userId: 'user-123', type: 'session' });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const payload = verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.userId).toBe('user-123');
      expect(payload!.type).toBe('session');
    });

    it('returns null for invalid token', () => {
      expect(verifyToken('invalid-token')).toBeNull();
      expect(verifyToken('')).toBeNull();
    });

    it('returns null for tampered token', () => {
      const token = generateToken({ userId: 'user-123' });
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(verifyToken(tampered)).toBeNull();
    });

    it('respects expiry', () => {
      const token = generateToken({ userId: 'user-123' }, '0s');
      // Token with 0s expiry should be expired immediately
      const payload = verifyToken(token);
      expect(payload).toBeNull();
    });
  });

  describe('generateSlug', () => {
    it('creates a lowercase slug with random suffix', () => {
      const slug = generateSlug('John Doe');
      expect(slug).toMatch(/^john-doe-[a-f0-9]{6}$/);
    });

    it('strips special characters', () => {
      const slug = generateSlug('Test@User#123');
      expect(slug).toMatch(/^test-user-123-[a-f0-9]{6}$/);
    });

    it('generates unique slugs for same input', () => {
      const slug1 = generateSlug('Same Name');
      const slug2 = generateSlug('Same Name');
      expect(slug1).not.toBe(slug2);
    });

    it('handles empty string gracefully', () => {
      const slug = generateSlug('');
      expect(slug).toMatch(/^-?[a-f0-9]{6}$/);
    });
  });

  describe('OAuth state helpers', () => {
    it('creates parseable oauth state values', () => {
      const state = createOAuthState('signup');
      expect(state).toMatch(/^signup:[a-f0-9]{48}$/);
      expect(parseOAuthState(state)).toBe('signup');
    });

    it('rejects malformed oauth state values', () => {
      expect(parseOAuthState('signup')).toBeNull();
      expect(parseOAuthState('admin:123')).toBeNull();
      expect(parseOAuthState(null)).toBeNull();
    });
  });

  describe('DEFAULT_AGENT_TOKEN_SCOPES', () => {
    it('contains 9 default scopes', () => {
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toHaveLength(9);
    });

    it('includes essential read/write scopes', () => {
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toContain('profile:read');
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toContain('bookings:read');
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toContain('bookings:write');
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toContain('event-types:read');
      expect(DEFAULT_AGENT_TOKEN_SCOPES).toContain('event-types:write');
    });
  });

  describe('normalizeAgentTokenScopes', () => {
    it('filters to only allowed scopes', () => {
      const result = normalizeAgentTokenScopes(['profile:read', 'invalid:scope', 'bookings:write']);
      expect(result).toContain('profile:read');
      expect(result).toContain('bookings:write');
      expect(result).not.toContain('invalid:scope');
    });

    it('returns empty array for non-array input', () => {
      expect(normalizeAgentTokenScopes(null)).toEqual([]);
      expect(normalizeAgentTokenScopes(undefined)).toEqual([]);
      expect(normalizeAgentTokenScopes('string')).toEqual([]);
      expect(normalizeAgentTokenScopes(42)).toEqual([]);
    });

    it('deduplicates scopes', () => {
      const result = normalizeAgentTokenScopes(['profile:read', 'profile:read', 'profile:read']);
      expect(result).toEqual(['profile:read']);
    });

    it('filters out non-string items in array', () => {
      const result = normalizeAgentTokenScopes(['profile:read', 42, null, 'bookings:read']);
      expect(result).toEqual(['profile:read', 'bookings:read']);
    });
  });

  describe('validateAgentTokenScopes', () => {
    it('returns defaults when no scopes requested', () => {
      const result = validateAgentTokenScopes([]);
      expect(result.scopes).toEqual([...DEFAULT_AGENT_TOKEN_SCOPES]);
      expect(result.invalidScopes).toEqual([]);
      expect(result.escalatedScopes).toEqual([]);
    });

    it('identifies invalid scopes', () => {
      const result = validateAgentTokenScopes(['profile:read', 'admin:nuke']);
      expect(result.invalidScopes).toContain('admin:nuke');
    });

    it('detects scope escalation for agent tokens', () => {
      const actor = {
        authType: 'agent_token' as const,
        scopes: ['profile:read'],
      };
      const result = validateAgentTokenScopes(['profile:read', 'bookings:write'], actor);
      expect(result.escalatedScopes).toContain('bookings:write');
    });

    it('does not flag escalation for session users', () => {
      const actor = {
        authType: 'session' as const,
        scopes: ['*'],
      };
      const result = validateAgentTokenScopes(['profile:read', 'bookings:write'], actor);
      expect(result.escalatedScopes).toEqual([]);
    });
  });
});
