<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Grafana Alerting

Turn Grafana alert groups into automated telephone calls using a webhook contact
point and the supplied custom JSON payload.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- Grafana Alerting with webhook **Custom Payload** support.
- Permission to manage contact points and notification policies.
- A VoiceCast tenant URL, API key, callflow UUID and destination number.
- HTTPS connectivity from Grafana to VoiceCast.

Custom Payload is not exposed by every Grafana Cloud stack. Confirm availability
before installation.

## Installation

1. Open **Alerting → Contact points** and create a **Webhook** contact point.
2. Set URL to `https://your-tenant.example.com/api/call/v2` and method to POST.
3. Set authorization scheme to `Bearer` and store the VoiceCast API key in the
   protected credential field.
4. Enable **Custom Payload** and paste
   [voicecast-payload.tmpl](voicecast-payload.tmpl).
5. Define these payload variables:

| Variable | Required | Value |
| --- | --- | --- |
| `callee` | Yes | One E.164 destination, for example `+31612345678`. |
| `callflow` | Yes | VoiceCast callflow UUID. |

6. Enable **Disable resolved message** if recovery calls are unwanted.
7. Save, test, and connect the contact point through a notification policy.

The spoken text comes from Grafana's `default.message` template. Edit the
`$message` expression in the payload template to use another notification
template. The integration also sends `status` and `source: grafana` as callflow
parameters.

## Delivery behavior

One Grafana notification group creates one call. The payload contains the
current UTC time, so VoiceCast queues the call rather than holding Grafana's
request open. A successful webhook delivery only confirms queueing. Disable
Grafana retries where possible; after a timeout, check Calls v2 first.

| Error | Check |
| --- | --- |
| 401 | Bearer credential and enabled VoiceCast user. |
| 400 | Number, callflow UUID and custom-payload rendering. |
| 404 | Tenant hostname and `/api/call/v2` path. |
| Test succeeds but alerts do not call | Notification policy, label matchers, mute timings and resolved-message setting. |

References: [Grafana webhook contact points](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/).

This integration does not imply endorsement or certification by Grafana Labs.
