<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for FortiGate

Turn FortiGate security, SD-WAN and system events into automated VoiceCast
telephone alerts. The integration uses a native FortiOS Automation Stitch
webhook action to queue a Calls call directly from the firewall, without an
external relay server.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**.
Contact: [voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Features

- Native FortiOS webhook action and event-log trigger.
- Authenticated HTTPS request to the VoiceCast Calls API.
- Dynamic FortiGate device, event, message and log ID callflow parameters.
- Five-minute minimum interval to limit repeated calls during an alert storm.
- Remote certificate verification enabled.
- Example failed-administrator-login trigger that can be replaced with another
  FortiOS event-log trigger and field filters.

## Requirements

| Component | Requirement |
| --- | --- |
| FortiGate | FortiOS 7.x with Automation Stitches and webhook actions. |
| Permissions | An administrator who can configure system automation actions, triggers and stitches. |
| VoiceCast | Tenant HTTPS hostname, dedicated API key, callflow UUID and international E.164 destination. |
| Connectivity | Working DNS, accurate system time and outbound TCP 443 from the FortiGate management plane to the VoiceCast tenant. |
| TLS | The FortiGate must trust the certificate chain used by the VoiceCast tenant. |

FortiOS CLI details can differ between maintenance releases. Review the
generated configuration with `show system automation-action` before deploying
it broadly through FortiManager.

## Installation

### 1. Prepare VoiceCast

1. Request VoiceCast access from voicecast@cloudaware.eu and generate a
   dedicated API key from your profile.
2. Create a callflow with connected **Start → TTS → Hangup** blocks.
3. Configure a validated caller ID in Start.
4. Set the TTS text to `{{alert_text}}`, save the callflow and copy its UUID.

The integration provides these callflow parameters:

| Placeholder | Value |
| --- | --- |
| `{{alert_text}}` | A spoken summary built from the FortiGate device name, event description and message. |
| `{{message}}` | The FortiOS log message. |
| `{{source}}` | `fortigate` |
| `{{event}}` | The FortiOS log description. |
| `{{device}}` | The FortiGate device name. |
| `{{log_id}}` | The FortiOS event log ID. |

### 2. Configure the FortiOS template

Download [voicecast.conf](voicecast.conf) and replace all four placeholders:

```text
voicecast.example.com
REPLACE_WITH_VOICECAST_API_KEY
REPLACE_WITH_CALLFLOW_UUID
REPLACE_WITH_E164_NUMBER
```

Use only the tenant hostname in `set uri`; FortiOS receives the `https`
protocol separately. The phone number must use international E.164 format,
for example `+31612345678`.

The API key is stored as an Automation Stitch HTTP-header value. Administrators
who can view the configuration, exported configurations or backups may be able
to recover it. Use a dedicated VoiceCast user/API key and rotate it if a device
or backup is exposed.

If the VoiceCast API IP allowlist is enabled, add the public egress address used
by the FortiGate management plane. In an SD-WAN or multi-WAN deployment, verify
the actual source address and allowlist every address that may be used.

### 3. Import the configuration

Back up the FortiGate configuration. Open the CLI and paste the complete edited
`voicecast.conf`. Verify the created objects:

```fortios
show system automation-action voicecast-call
show system automation-trigger voicecast-admin-login-failed
show system automation-stitch voicecast-admin-login-failed
```

The included trigger uses event log ID `32002`, the failed administrator login
event. The webhook action has `verify-host-cert` enabled and does not fall back
to plain HTTP.

### 4. Test the integration

Testing places a real call to the configured destination:

```fortios
diagnose automation test voicecast-admin-login-failed
```

Check **Calls** in VoiceCast. A successful webhook only confirms that the
asynchronous call was accepted and queued; it does not mean the recipient
answered or heard the message.

For a realistic variable-substitution test, cause the configured event in a
controlled maintenance window—for the supplied trigger, make one deliberately
failed administrator login—and verify the spoken device and event details.

## Select another FortiOS event

FortiOS event-log triggers identify events by log ID and can apply field
filters. Find a representative event in **Log & Report → System Events**, use
**Create Automation Trigger**, and attach `voicecast-call` as its action. This
is useful for events such as:

- SD-WAN member or SLA status changes;
- HA failover and cluster events;
- VPN, administrator and authentication failures;
- conserve mode, high availability or system health events;
- FortiGuard and security-service events.

Available `%%log.<field>%%` variables depend on the selected log ID. Consult the
FortiOS Log Message Reference for that release before adding a field to the
JSON body. Keep the `alert_text` concise and do not speak passwords, tokens,
personal data or complete raw logs.

The provided action limits execution to once every 300 seconds. Change
`minimum-interval` only after considering the cost and impact of a flapping
event. The limit belongs to the shared `voicecast-call` action, so all stitches
using that action share it.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| HTTP 401 | The VoiceCast API key, `Authorization` header and enabled VoiceCast user. |
| HTTP 403 | The FortiGate egress address and the domain's VoiceCast bearer API allowlist. |
| TLS or connection failure | DNS, FortiGate time, outbound TCP 443, tenant hostname and trusted CA chain. Do not disable host-certificate verification. |
| HTTP 400 or 422 | E.164 destination, callflow UUID and JSON after FortiOS variable substitution. |
| Stitch does not run | Trigger log ID, field filters, VDOM/root context, minimum interval and Automation Stitch history. |
| Queued but no call | VoiceCast dispatcher, caller ID, call schedule, trunk and Calls event details. |
| Call connects but is silent | TTS configuration and the callflow's `{{alert_text}}` placeholder. |

Enable FortiOS Automation Stitch debugging only during troubleshooting because
debug output can contain event details:

```fortios
diagnose debug reset
diagnose debug application autod -1
diagnose debug enable
```

Reproduce the event, then stop debugging:

```fortios
diagnose debug disable
diagnose debug reset
```

Do not automatically retry a timed-out webhook. VoiceCast may have queued the
call before the response was lost. Check **Calls** first to avoid duplicates.

## Remove the integration

Remove the stitch before its trigger and action:

```fortios
config system automation-stitch
    delete "voicecast-admin-login-failed"
end
config system automation-trigger
    delete "voicecast-admin-login-failed"
end
config system automation-action
    delete "voicecast-call"
end
```

Rotate or delete the corresponding VoiceCast API key when decommissioning a
FortiGate.

## Fortinet documentation

- [Webhook actions](https://docs.fortinet.com/document/fortigate/7.0.5/administration-guide/989735/webhook-action)
- [Variables in actions](https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/427797/variables-in-actions)
- [FortiOS event-log triggers](https://docs.fortinet.com/document/fortigate/7.6.5/administration-guide/950487/fortios-event-log-trigger)
- [Diagnosing Automation Stitches](https://docs.fortinet.com/document/fortigate/7.6.6/administration-guide/921599/diagnosing-automation-stitches)

FortiGate, FortiOS and Fortinet are trademarks of Fortinet, Inc. This community
integration does not imply endorsement or certification by Fortinet.
