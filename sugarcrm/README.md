<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for SugarCRM

Queue VoiceCast calls when configured SugarCRM Case or Lead fields enter
selected values. The package uses upgrade-safe Extension Framework logic hooks.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Build and install

Build the self-contained Module Loader archive from the repository root:

```bash
bash build-package.sh
```

Upload `voicecast-sugarcrm.zip` through **Admin → Module Loader**, install it,
and run **Quick Repair and Rebuild**. Copy
`custom/voicecast_config.php.example` to `custom/voicecast_config.php` on the
SugarCRM server and restrict it to the web-server account.

## Global configuration

| Key | Description |
| --- | --- |
| `enabled` | Master switch for all VoiceCast hooks. |
| `url` | Tenant HTTPS base URL without `/api`. |
| `api_key` | VoiceCast bearer API key. |
| `callflow` | Default callflow UUID. |
| `rules` | Rules keyed by module name, initially `Cases` and `Leads`. |

## Rule settings

| Key | Description |
| --- | --- |
| `when_field` | Record field inspected after save. |
| `when_values` | Exact values that trigger a call. |
| `only_on_change` | When true, unrelated saves do not repeat the call. |
| `phone_field` | Field containing one E.164 number. |
| `message` | Spoken template using placeholders such as `{name}` and `{status}`. |
| `callflow` | Optional module-specific override. |

Create referenced custom fields in Studio first. To add another module, add its
rule and an equivalent LogicHooks extension registration. Calls are queued with
a UTC timestamp. The hook makes one request and suppresses credentials and raw
responses from logs. Check Calls v2 before repeating a save after a timeout.

This integration does not imply endorsement or certification by SugarCRM.
