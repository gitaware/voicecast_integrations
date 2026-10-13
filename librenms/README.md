<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for LibreNMS

Turn LibreNMS device and service alerts into automated VoiceCast phone calls
with the built-in API alert transport. No LibreNMS plugin or extra package is
required.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- A LibreNMS installation that supports the API alert transport.
- Permission to manage alert transports and rules.
- A VoiceCast tenant URL, API key, callflow UUID and E.164 destination number.
- HTTPS connectivity from the LibreNMS poller to VoiceCast.

## Installation and configuration

1. In LibreNMS, open **Alerts → Alert Transports** and add an **API** transport.
2. Set **Method** to `POST`.
3. Set **API URL** to `https://your-tenant.example.com/api/call/v2`.
4. Leave **Send as form** disabled so the request body remains JSON.
5. Paste [voicecast-headers.txt](voicecast-headers.txt) into **Headers** and
   replace `REPLACE_WITH_VOICECAST_API_KEY`.
6. Paste [voicecast-body.blade.json](voicecast-body.blade.json) into **Body**.
7. Replace `REPLACE_WITH_E164_NUMBER` with one international number such as
   `+31612345678`, and replace `REPLACE_WITH_CALLFLOW_UUID` with the VoiceCast
   callflow UUID.
8. Save and use **Test transport**. This queues a real phone call.
9. Assign the transport to the intended alert rule or alert transport group.

The Blade `json_encode` expressions safely turn LibreNMS values into JSON,
including quotes and line breaks. Do not replace them with quoted `{{ ... }}`
expressions. The payload exposes `message`, `alert_text`, `hostname`, `severity`,
`title`, and `source: librenms` to the selected VoiceCast callflow.

## Delivery behavior

Each LibreNMS transport execution queues one immediate call. Recovery alerts
also call unless the corresponding alert rule or transport assignment excludes
them. A successful HTTP response means the call was queued, not answered.

Use a dedicated least-privilege VoiceCast API user and restrict access to the
LibreNMS transport configuration because it contains the bearer key. The API
does not accept an idempotency key. If LibreNMS reports a timeout, check the
VoiceCast Calls page before testing again to avoid duplicate calls.

| Result | Check |
| --- | --- |
| HTTP 400 | Destination number, callflow UUID and rendered JSON body. |
| HTTP 401/403 | API key, enabled API user and tenant access policy. |
| HTTP 404 | Tenant hostname and the `/api/call/v2` path. |
| Test works but alerts do not call | Rule match, transport assignment, recovery behavior and alert log. |

References: [LibreNMS API transport](https://docs.librenms.org/Alerting/Transports/Api/)
and [LibreNMS alert templates](https://docs.librenms.org/Alerting/Templates/).

This integration does not imply endorsement or certification by LibreNMS.
