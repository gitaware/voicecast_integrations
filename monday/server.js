'use strict';

const crypto = require('node:crypto');
const http = require('node:http');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164 = /^\+[1-9][0-9]{6,14}$/;
const MAX_BODY_BYTES = 1024 * 1024;

class ActionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function base64urlJson(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch (_) {
    throw new ActionError(401, 'Invalid monday authorization token');
  }
}

function verifyJwt(value, secret, expectedAudience, now = Math.floor(Date.now() / 1000)) {
  if (!secret) throw new ActionError(500, 'Integration is not configured');
  const token = String(value || '').replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) throw new ActionError(401, 'Invalid monday authorization token');
  const header = base64urlJson(parts[0]);
  const payload = base64urlJson(parts[1]);
  if (header.alg !== 'HS256') throw new ActionError(401, 'Invalid monday authorization token');
  const calculated = crypto.createHmac('sha256', secret).update(parts[0] + '.' + parts[1]).digest();
  let supplied;
  try { supplied = Buffer.from(parts[2], 'base64url'); } catch (_) { supplied = Buffer.alloc(0); }
  if (supplied.length !== calculated.length || !crypto.timingSafeEqual(supplied, calculated)) {
    throw new ActionError(401, 'Invalid monday authorization token');
  }
  if (!Number.isInteger(payload.exp) || payload.exp < now ||
      (payload.nbf !== undefined && (!Number.isInteger(payload.nbf) || payload.nbf > now))) {
    throw new ActionError(401, 'Expired monday authorization token');
  }
  if (expectedAudience) {
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expectedAudience)) throw new ActionError(401, 'Invalid token audience');
  }
  return payload;
}

function field(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value && typeof value === 'object') {
    for (const key of ['text', 'value', 'phone']) {
      if (typeof value[key] === 'string') return value[key].trim();
    }
  }
  return '';
}

function actionInput(body, allowedHosts) {
  if (!body || typeof body !== 'object' || !body.payload || typeof body.payload !== 'object') {
    throw new ActionError(400, 'Invalid action payload');
  }
  const values = body.payload.inboundFieldValues || body.payload.inputFields || {};
  const credentials = body.payload.credentialsValues || {};
  const credential = credentials.voicecast || credentials.voicecast_credentials || {};
  const apiKey = field(credential.accessToken);
  const urlValue = field(values.voicecast_url);
  const callee = field(values.callee);
  const callflow = field(values.callflow);
  const message = field(values.message);

  let url;
  try { url = new URL(urlValue); } catch (_) { throw new ActionError(400, 'VoiceCast URL is invalid'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new ActionError(400, 'VoiceCast URL must be an HTTPS base URL');
  }
  const hosts = Array.isArray(allowedHosts) ? allowedHosts : String(allowedHosts || '')
    .split(',').map(host => host.trim().toLowerCase()).filter(Boolean);
  if (hosts.length === 0) throw new ActionError(500, 'VoiceCast host allowlist is not configured');
  if (!hosts.includes(url.hostname.toLowerCase()) || (url.port && url.port !== '443')) {
    throw new ActionError(400, 'VoiceCast tenant host is not allowed');
  }
  if (/\/api(?:\/|$)/.test(url.pathname)) {
    throw new ActionError(400, 'VoiceCast URL must not include an API path');
  }
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new ActionError(400, 'VoiceCast credential is missing');
  if (!E164.test(callee)) throw new ActionError(400, 'Telephone number must use international E.164 format');
  if (!UUID.test(callflow)) throw new ActionError(400, 'Callflow must be a UUID');
  if (!message) throw new ActionError(400, 'Message is required');

  return {
    endpoint: url.toString().replace(/\/$/, '') + '/api/call/v2',
    apiKey,
    payload: {
      callee,
      callflow,
      calldate: new Date().toISOString(),
      parameters: { message, alert_text: message, source: 'monday' }
    }
  };
}

async function runAction(body, options = {}) {
  const allowedHosts = options.allowedHosts ?? process.env.VOICECAST_ALLOWED_HOSTS;
  const request = actionInput(body, allowedHosts);
  const fetchImpl = options.fetch || globalThis.fetch;
  let response;
  try {
    response = await fetchImpl(request.endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: {
        authorization: 'Bearer ' + request.apiKey,
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify(request.payload)
    });
  } catch (_) {
    throw new ActionError(502, 'VoiceCast could not be reached; check Calls v2 before retrying');
  }
  let result;
  try { result = await response.json(); } catch (_) { result = null; }
  if (response.status !== 201 || result?.success !== true || !UUID.test(result?.data?.call_uuid || '')) {
    throw new ActionError(502, 'VoiceCast rejected the call; check Calls v2 before retrying');
  }
  return { call_uuid: result.data.call_uuid };
}

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  response.end(body);
}

function createHandler(options = {}) {
  const secret = options.signingSecret ?? process.env.MONDAY_SIGNING_SECRET;
  const audience = options.audience ?? process.env.MONDAY_ACTION_URL;
  return async function handler(request, response) {
    if (request.method === 'GET' && request.url === '/health') return json(response, 200, { status: 'ok' });
    if (request.method !== 'POST' || request.url !== '/action/run') return json(response, 404, { error: 'Not found' });
    try {
      verifyJwt(request.headers.authorization, secret, audience);
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw new ActionError(413, 'Request is too large');
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (_) { throw new ActionError(400, 'Invalid JSON body'); }
      const outputFields = await runAction(body, options);
      return json(response, 200, { outputFields });
    } catch (error) {
      const status = error instanceof ActionError ? error.status : 500;
      const message = error instanceof ActionError ? error.message : 'Integration failed';
      return json(response, status, { error: message });
    }
  };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer(createHandler()).listen(port, '0.0.0.0', () => {
    process.stdout.write(`VoiceCast monday integration listening on port ${port}\n`);
  });
}

module.exports = { ActionError, actionInput, createHandler, runAction, verifyJwt };
