<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast custom app for Make

Add a **Place a VoiceCast call** action module to Make scenarios. Values from
any preceding module can supply the destination and spoken message.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Installation

1. Create a custom app in the Make Developer Hub.
2. Create an API-key connection and paste [connection.json](connection.json)
   into its parameters.
3. Create an **Action** module named `placeCall` with label **Place a VoiceCast
   call**.
4. Paste [place-call.parameters.json](place-call.parameters.json) into
   **Mappable parameters**.
5. Paste [place-call.communication.json](place-call.communication.json) into
   **Communication**.
6. Save, create a test connection, and run the module with a controlled number.

## Connection fields

| Field | Description |
| --- | --- |
| `baseUrl` | Tenant HTTPS base URL without `/api` or a trailing slash. |
| `apiKey` | VoiceCast bearer API key; Make stores this as a password value. |

## Module inputs

| Parameter | Description |
| --- | --- |
| `callee` | One E.164 number, for example `+31612345678`. |
| `callflow` | VoiceCast callflow UUID. |
| `message` | Text provided as `message` and `alert_text`. |

The module sets `source` to `make`, supplies an explicit UTC timestamp and
returns `body.data`, including `call_uuid`. Configure scenario error handling
carefully: an HTTP timeout can occur after VoiceCast saved the call. Check Calls
before retrying to avoid duplicate calls.

Reference: [Make custom-app action modules](https://developers.make.com/custom-apps-documentation/app-structure/modules/action/components).

This integration does not imply endorsement or certification by Make.
