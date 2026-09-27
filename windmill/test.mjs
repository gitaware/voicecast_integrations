import assert from "node:assert/strict";
import { test } from "node:test";
import { main } from "./place_voicecast_call.ts";

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const resource = { url: "https://tenant.example.com", api_key: "test-secret", default_callflow: UUID };

test("queues a call and returns its UUID", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { status: 201, json: async () => ({ success: true, data: { call_uuid: UUID } }) };
  };
  try {
    assert.deepEqual(await main(resource, "+31612345678", "Windmill alert"), { call_uuid: UUID });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://tenant.example.com/api/call/v2");
    assert.equal(calls[0].options.redirect, "manual");
    assert.equal(calls[0].options.headers.Authorization, "Bearer test-secret");
    const body = JSON.parse(calls[0].options.body);
    assert.deepEqual(body.parameters, { message: "Windmill alert", alert_text: "Windmill alert", source: "windmill" });
    assert.match(body.calldate, /Z$/);
  } finally { globalThis.fetch = originalFetch; }
});

test("rejects invalid input before making a request", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("must not run"); };
  try {
    await assert.rejects(main(resource, "0612345678", "test"), /E.164/);
    await assert.rejects(main({ ...resource, url: "http://tenant.example.com" }, "+31612345678", "test"), /HTTPS/);
    await assert.rejects(main(resource, "+31612345678", " "), /Message/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("sanitizes failed responses and does not retry", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { status: 500, json: async () => ({ error: "test-secret" }) };
  };
  try {
    await assert.rejects(main(resource, "+31612345678", "test"), error => !error.message.includes("test-secret"));
    assert.equal(calls, 1);
  } finally { globalThis.fetch = originalFetch; }
});
