import { beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Use an isolated temp directory for test data so tests don't pollute real data.
// CRITICAL: Set env vars at top level BEFORE any app module is imported,
// because db.ts resolves DATA_DIR once at module load time.
const TEST_DATA_DIR = path.join(__dirname, '..', '.test-data');
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.JWT_SECRET = 'test-secret-key-minimum-32-characters-long';
(process.env as any).NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Ensure dir exists on initial load
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

beforeEach(() => {
  // Clean and recreate test data directory before each test
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});
