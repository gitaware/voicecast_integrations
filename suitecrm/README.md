<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for SuiteCRM

Queue VoiceCast calls when SuiteCRM Cases or Leads enter configured states. The
package uses the SuiteCRM legacy Extension Framework used by SuiteCRM 7 and the
legacy backend of SuiteCRM 8.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Build and install

Build the self-contained Module Loader archive from the repository root:

```bash
bash build-package.sh
```

Upload `voicecast-suitecrm.zip` through **Admin → Module Loader**, install it,
and run **Quick Repair and Rebuild**. Copy
`custom/voicecast_config.php.example` to `custom/voicecast_config.php`, enter the
credentials, and restrict the file to the web-server account.

## Configuration

| Setting | Purpose |
| --- | --- |
| `enabled` | Enables or disables every VoiceCast rule. |
| `url` | VoiceCast tenant HTTPS base URL. |
| `api_key` | Bearer API key. |
| `callflow` | Default callflow UUID. |
| `rules` | Per-module trigger definitions. |
| `when_field` / `when_values` | Field and exact values that place a call. |
| `only_on_change` | Prevents repeated calls on unrelated saves. |
| `phone_field` | Record field holding an E.164 number. |
| `message` | Template with scalar record placeholders. |
| Rule `callflow` | Optional per-module callflow override. |

The example contains Cases and Leads. Create custom fields in Studio before
referencing them. Adding other modules also requires a LogicHooks extension
registration for that module.

The hook follows no redirects, makes one request, queues the call in UTC and
does not log the API key or response body. After an uncertain timeout, inspect
Calls v2 before saving again. Validate the package on a staging copy of your
exact SuiteCRM release.

Reference: [SuiteCRM Logic Hooks](https://docs.suitecrm.com/developer/core-framework/logic-hooks/).

This integration does not imply endorsement or certification by SuiteCRM.
