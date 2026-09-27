<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for n8n

Import a reusable n8n workflow that queues a VoiceCast telephone call. Invoke
it from other workflows after alerts, CRM events, schedules or approvals.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Installation

1. Import [voicecast-workflow.json](voicecast-workflow.json) into n8n.
2. Create an **HTTP Header Auth** credential:

   | Field | Value |
   | --- | --- |
   | Name | `Authorization` |
   | Value | `Bearer <VoiceCast API key>` |

3. Open **Queue VoiceCast call** and select that credential.
4. Save and activate the workflow as required by your n8n execution model.
5. Add an **Execute Workflow** node to another workflow and pass one item with
   the following configuration fields:

| Input property | Required | Description |
| --- | --- | --- |
| `voicecast_url` | Yes | Tenant HTTPS base URL without `/api`. |
| `callee` | Yes | One E.164 number. |
| `callflow` | Yes | VoiceCast callflow UUID. |
| `message` | Yes | Text spoken by the callflow. |

The HTTP Request node sets a 20-second timeout, follows no redirects and queues
the call with the current UTC time. It sends `source: n8n`. Keep the API key in
n8n credentials, never in workflow JSON or input data.

## Testing and retries

Execute the imported workflow manually with pinned sample input. This places a
real call. A returned HTTP 201 means queued. Avoid automatic workflow retries;
after a timeout, inspect VoiceCast Calls before rerunning the node.

This integration does not imply endorsement or certification by n8n.
