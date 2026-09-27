<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Windmill

Use a native TypeScript script to place VoiceCast calls from Windmill scripts,
schedules, webhooks, Flows and Apps.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Installation

1. Add a resource type named `voicecast` and paste
   [voicecast.resource-type.json](voicecast.resource-type.json) as its schema.
2. Create a Windmill **secret Variable** containing the API key.
3. Create a VoiceCast Resource and reference the secret as `$var:<path>`.
4. Create a native TypeScript/Bun script from
   [place_voicecast_call.ts](place_voicecast_call.ts).
5. Associate its `voicecast` argument with the resource type and deploy.

Using `$var:` keeps the API key itself out of Windmill resource version history.

## Resource fields

| Field | Required | Description |
| --- | --- | --- |
| `url` | Yes | Tenant HTTPS base URL without `/api`. |
| `api_key` | Yes | Prefer a Windmill secret Variable reference. |
| `default_callflow` | No | Default callflow UUID. |

## Script parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `voicecast` | Yes | VoiceCast Resource selected in Windmill. |
| `callee` | Yes | One E.164 number. |
| `message` | Yes | Spoken text. |
| `callflow` | Conditional | Overrides the resource default; required if no default exists. |

The result contains `call_uuid` for later Flow steps. The script follows no
redirects, has a 20-second timeout and makes one request. Check Calls v2 before
rerunning after a timeout. Run offline tests with:

```bash
node --experimental-strip-types test.mjs
```

This integration does not imply endorsement or certification by Windmill.
