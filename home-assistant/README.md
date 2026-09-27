<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Home Assistant

Add a reusable `script.voicecast_call` action to Home Assistant and invoke it
from any automation, dashboard action or developer-tools test.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- Home Assistant with YAML packages enabled.
- A VoiceCast tenant URL, API key and callflow UUID.
- HTTPS access from Home Assistant to VoiceCast.

## Installation

1. Enable packages in `configuration.yaml`:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

2. Copy [voicecast.yaml](voicecast.yaml) to
   `config/packages/voicecast.yaml`.
3. Add the values shown in [secrets.yaml.example](secrets.yaml.example) to your
   existing `config/secrets.yaml`:

   | Secret | Value |
   | --- | --- |
   | `voicecast_api_url` | Full tenant endpoint ending in `/api/call/v2`. |
   | `voicecast_authorization` | `Bearer ` followed by the VoiceCast API key. |

4. Check the Home Assistant configuration and restart.
5. Call `script.voicecast_call` from **Developer tools → Actions**.

## Action fields

| Field | Required | Description |
| --- | --- | --- |
| `message` | Yes | Text spoken by the callflow. Templates are supported. |
| `to` | Yes | One international E.164 number. |
| `callflow` | Yes | VoiceCast callflow UUID. |

[automation.yaml.example](automation.yaml.example) contains a state-triggered
example. Copy its action into an automation and change the entity, delay,
recipient, callflow and text. The package script uses queued mode with `max: 10`;
adjust these values in `voicecast.yaml` if another local queue policy is needed.

The REST command timeout is 20 seconds, verifies TLS, and expects HTTP 201. A
successful action means the call was queued. Check Calls v2 before retrying an
ambiguous failure.

Reference: [Home Assistant RESTful Command](https://www.home-assistant.io/integrations/rest_command/).

This integration does not imply endorsement or certification by Home Assistant.
