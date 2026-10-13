<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Uptime Kuma

Call responders when Uptime Kuma reports downtime, recovery or certificate
events by using its built-in webhook notification provider.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- **Uptime Kuma 2.2.1 or newer.** Earlier affected versions contain a custom
  webhook-body template vulnerability; upgrade before installing this setup.
- Permission to manage notifications and monitors.
- A VoiceCast tenant URL, API key, callflow UUID and E.164 destination number.
- HTTPS connectivity from Uptime Kuma to VoiceCast.

## Installation and configuration

1. Open **Settings → Notifications → Setup Notification** and select
   **Webhook**.
2. Set **Post URL** to `https://your-tenant.example.com/api/call/v2`.
3. Set **Request Body** to **Custom Body** and **HTTP Method** to `POST`.
4. Paste [voicecast-body.liquid.json](voicecast-body.liquid.json) into the
   custom body. Replace `REPLACE_WITH_E164_NUMBER` and
   `REPLACE_WITH_CALLFLOW_UUID`.
5. Paste [voicecast-headers.json](voicecast-headers.json) into
   **Additional Headers** and replace `REPLACE_WITH_VOICECAST_API_KEY`.
6. Save and press **Test**. The test uses sample monitor values and queues a
   real phone call.
7. Enable the saved notification on each intended monitor or status page event.

The Liquid `json` filter is intentional: it safely escapes event text before it
is inserted into JSON. The callflow receives `message`, `alert_text`, `status`,
`monitor`, `target`, and `source: uptime_kuma` parameters.

## Delivery behavior and security

One webhook notification queues one immediate VoiceCast call. Whether recovery,
certificate and repeated notifications are sent is controlled by Uptime Kuma's
monitor and notification settings. A successful response confirms queueing only.

Use a dedicated least-privilege VoiceCast API user and restrict access to Uptime
Kuma notification settings. They contain the bearer key. If a request times out,
check the VoiceCast Calls page before retrying because the create-call endpoint
does not accept an idempotency key.

| Result | Check |
| --- | --- |
| HTTP 400 | E.164 number, callflow UUID and rendered custom JSON. |
| HTTP 401/403 | Additional Headers JSON and API-user access. |
| HTTP 404 | Tenant hostname and `/api/call/v2` path. |
| Test works but events do not call | Notification assignment and monitor notification options. |

References: [Uptime Kuma webhook provider](https://github.com/louislam/uptime-kuma/blob/master/server/notification-providers/webhook.js)
and [security advisory GHSA-v832-4r73-wx5j](https://github.com/louislam/uptime-kuma/security/advisories/GHSA-v832-4r73-wx5j).

This integration does not imply endorsement or certification by Uptime Kuma.
