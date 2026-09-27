'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { actionInput, runAction, verifyJwt } = require('./server.js');

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const SECRET = 'test-signing-secret';
const ALLOWED_HOSTS = ['tenant.example.com'];

function jwt(payload, secret = SECRET, header = { alg: 'HS256', typ: 'JWT' }) {
  const parts = [header, payload].map(value => Buffer.from(JSON.stringify(value)).toString('base64url'));
  parts.push(crypto.createHmac('sha256', secret).update(parts.join('.')).digest('base64url'));
  return parts.join('.');
}

function body(overrides = {}) {
  return { payload: {
    credentialsValues: { voicecast: { accessToken: 'test-api-key' } },
    inboundFieldValues: {
      voicecast_url: 'https://tenant.example.com', callee: '+31612345678',
      callflow: UUID, message: 'Critical ticket: “Database” is down', ...overrides
    }
  } };
}

test('verifies a signed, unexpired monday JWT and audience', () => {
  const token = jwt({ exp: 2000, aud: 'https://app.example/action/run', accountId: 42 });
  assert.equal(verifyJwt('Bearer ' + token, SECRET, 'https://app.example/action/run', 1000).accountId, 42);
  for (const candidate of [token + 'x', jwt({ exp: 999 }), jwt({ exp: 2000, aud: 'wrong' }),
    jwt({ exp: 2000 }, SECRET, { alg: 'none' })]) {
    assert.throws(() => verifyJwt(candidate, SECRET, 'https://app.example/action/run', 1000));
  }
});

test('builds a queued VoiceCast call from monday fields and credential', () => {
  const result = actionInput(body(), ALLOWED_HOSTS);
  assert.equal(result.endpoint, 'https://tenant.example.com/api/call/v2');
  assert.equal(result.apiKey, 'test-api-key');
  assert.match(result.payload.calldate, /Z$/);
  assert.deepEqual(result.payload.parameters, {
    message: 'Critical ticket: “Database” is down',
    alert_text: 'Critical ticket: “Database” is down', source: 'monday'
  });
});

test('accepts mapped monday values and rejects unsafe or invalid input', () => {
  assert.equal(actionInput(body({ callee: { phone: '+31612345678' } }), ALLOWED_HOSTS).payload.callee, '+31612345678');
  for (const overrides of [
    { voicecast_url: 'http://tenant.example.com' },
    { voicecast_url: 'https://user:pass@tenant.example.com' },
    { voicecast_url: 'https://tenant.example.com/api/call/v2' },
    { callee: '0612345678' }, { callflow: 'bad' }, { message: ' ' },
    { voicecast_url: 'https://untrusted.example.com' }
  ]) assert.throws(() => actionInput(body(overrides), ALLOWED_HOSTS));
  const missingCredential = body();
  missingCredential.payload.credentialsValues = {};
  assert.throws(() => actionInput(missingCredential, ALLOWED_HOSTS));
  assert.throws(() => actionInput(body(), []));
});

test('posts once, preserves text and accepts only a successful create response', async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return { status: 201, json: async () => ({ success: true, data: { call_uuid: UUID } }) };
  };
  assert.deepEqual(await runAction(body(), { fetch, allowedHosts: ALLOWED_HOSTS }), { call_uuid: UUID });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-api-key');
  assert.equal(JSON.parse(calls[0].options.body).parameters.source, 'monday');

  for (const response of [
    { status: 200, json: async () => ({ success: true, data: { call_uuid: UUID } }) },
    { status: 201, json: async () => ({ success: false }) },
    { status: 201, json: async () => { throw new Error('secret response'); } }
  ]) {
    let attempts = 0;
    await assert.rejects(runAction(body(), { allowedHosts: ALLOWED_HOSTS,
      fetch: async () => { attempts++; return response; } }),
      error => !error.message.includes('secret'));
    assert.equal(attempts, 1);
  }
});
