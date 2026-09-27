<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast node for Node-RED

Add a **VoiceCast call** node to Node-RED flows. The node accepts message text
from upstream nodes, queues a telephone call, and attaches the created call UUID
to the outgoing message.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements and installation

- Node-RED running on Node.js 18 or newer.
- HTTPS access to a VoiceCast tenant.
- A VoiceCast API key and callflow UUID.

Clone or download this repository on the Node-RED host, then install the module
from its directory:

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-voicecast
```

Restart Node-RED and add **VoiceCast call** from the function category.

## Node configuration

| Setting | Required | Description |
| --- | --- | --- |
| Tenant URL | Yes | HTTPS tenant base URL without `/api`. |
| API key | Yes | Stored as a Node-RED password credential. |
| Number | Conditional | Default E.164 destination. |
| Callflow | Yes | Default VoiceCast callflow UUID. |
| Name | No | Label shown in the editor. |

## Input and output

The node accepts:

| Message property | Purpose |
| --- | --- |
| `msg.message` | Preferred spoken text. |
| `msg.payload` | Spoken text when `msg.message` is absent. |
| `msg.callee` | Optional per-message destination override. |
| `msg.callflow` | Optional per-message callflow override. |

On success, the original message continues with `msg.voicecast.call_uuid`. Use a
Catch node for errors. The node uses a 20-second timeout, rejects redirects and
makes one request. Check Calls before retrying after an uncertain failure.

Run the offline module test with `npm test`.

This integration does not imply endorsement or certification by Node-RED.
