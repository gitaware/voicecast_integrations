<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for monday workflows

Add a **Place a VoiceCast call** action to monday workflows. Users can combine
it with status, assignment, deadline and other monday triggers.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- A monday developer app and permission to add workflow automation blocks.
- Node.js 18 or newer, or a container runtime.
- A public HTTPS URL for this action service.
- VoiceCast tenant credentials and approved tenant hostnames.

## Installation: deploy the runtime

Run `npm start` or build [Dockerfile](Dockerfile). Configure:

| Environment variable | Required | Description |
| --- | --- | --- |
| `MONDAY_SIGNING_SECRET` | Yes | App Signing Secret from Developer Center. |
| `MONDAY_ACTION_URL` | Yes | Exact public URL ending in `/action/run`; used for JWT audience validation. |
| `VOICECAST_ALLOWED_HOSTS` | Yes | Comma-separated exact tenant hostnames allowed to receive API keys. |
| `PORT` | No | Listen port; defaults to `3000`. |

`GET /health` returns service health. Terminate TLS at a trusted reverse proxy
and do not expose the service over plain public HTTP.

## Configuration in monday

1. Add an **API Token Credentials** feature for the VoiceCast API key.
2. Add an Action automation block named **Place a VoiceCast call**.
3. Attach the credential with key `voicecast`.
4. Create required inputs:

| Key | Type | Value |
| --- | --- | --- |
| `voicecast_url` | Text | Tenant HTTPS base URL. |
| `callee` | Text or Phone | E.164 destination. |
| `callflow` | Text | VoiceCast callflow UUID. |
| `message` | Long text | Spoken text; monday mappings are supported. |

5. Add text output `call_uuid`, set Run URL to `/action/run`, and deploy.

The runtime verifies monday's HS256 JWT signature, expiry and audience. It
restricts credential forwarding to `VOICECAST_ALLOWED_HOSTS`, follows no
redirects and makes one API request. Run offline tests with `npm test`.

Reference: [monday workflow actions](https://developer.monday.com/apps/docs/workflows-actions).

This integration does not imply endorsement or certification by monday.com.
