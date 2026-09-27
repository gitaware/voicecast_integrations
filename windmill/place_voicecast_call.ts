// native

type VoiceCast = {
  url: string;
  api_key: string;
  default_callflow?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const E164 = /^\+[1-9][0-9]{6,14}$/;

export async function main(
  voicecast: VoiceCast,
  callee: string,
  message: string,
  callflow?: string,
) {
  let url: URL;
  try {
    url = new URL(voicecast.url);
  } catch (_) {
    throw new Error("VoiceCast tenant URL is invalid");
  }
  if (
    url.protocol !== "https:" || url.username || url.password ||
    url.search || url.hash || /\/api(?:\/|$)/.test(url.pathname)
  ) {
    throw new Error("VoiceCast URL must be an HTTPS base URL without an API path");
  }
  const selectedCallflow = String(callflow || voicecast.default_callflow || "").trim();
  const destination = String(callee || "").trim();
  const speech = String(message || "").trim();
  if (!E164.test(destination)) throw new Error("Telephone number must use E.164 format");
  if (!UUID.test(selectedCallflow)) throw new Error("Callflow must be a UUID");
  if (!speech) throw new Error("Message is required");
  if (!voicecast.api_key || /[\r\n]/.test(voicecast.api_key)) throw new Error("VoiceCast API key is missing");

  let response: Response;
  try {
    response = await fetch(url.toString().replace(/\/$/, "") + "/api/call/v2", {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: "Bearer " + voicecast.api_key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        callee: destination,
        callflow: selectedCallflow,
        calldate: new Date().toISOString(),
        parameters: { message: speech, alert_text: speech, source: "windmill" },
      }),
    });
  } catch (_) {
    throw new Error("VoiceCast could not be reached; check Calls v2 before retrying");
  }

  let result: any = null;
  try { result = await response.json(); } catch (_) { /* sanitized below */ }
  if (response.status !== 201 || result?.success !== true || !UUID.test(result?.data?.call_uuid || "")) {
    throw new Error("VoiceCast did not confirm the call; check Calls v2 before retrying");
  }
  return { call_uuid: result.data.call_uuid };
}
