import test from 'node:test';
import assert from 'node:assert/strict';
import { getMissingBackendEnv, ensureBackendEnv } from './config.js';

test('detects missing backend env vars', () => {
  const missing = getMissingBackendEnv({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: 'key' });
  assert.deepEqual(missing, ['SUPABASE_URL']);
});

test('accepts valid backend env vars', () => {
  assert.equal(
    ensureBackendEnv({
      SUPABASE_URL: 'https://demo.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'demo-key'
    }),
    true
  );
});

test('throws when placeholder values are left in config', () => {
  assert.throws(() => ensureBackendEnv({
    SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'YOUR_SERVICE_ROLE_KEY'
  }), /Missing required backend environment variables/);
});
