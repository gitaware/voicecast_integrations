# VoiceCast Python client

Use the standard-library `VoiceCastClient` class to queue immediate or
scheduled VoiceCast calls from Python, retrieve call status, and list available
outbound callflows.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- Python 3.10 or newer.
- A VoiceCast tenant HTTPS URL, API key, and outbound callflow UUID.
- A running VoiceCast dispatcher for call execution.

Create or replace the API key from your VoiceCast profile. You can copy a
callflow UUID from VoiceCast or call `list_callflows()` after configuration.

## Installation

Copy `voicecast_client.py` into your application. It uses only the Python
standard library, so there are no packages to install:

```python
from voicecast_client import VoiceCastClient, VoiceCastAPIError, VoiceCastError
```

## Configuration

Keep credentials in environment variables or a secret manager, never in source
control:

```bash
export VOICECAST_URL='https://voicecast.example.com'
export VOICECAST_API_KEY='replace-with-your-api-key'
export VOICECAST_CALLFLOW='550e8400-e29b-41d4-a716-446655440000'
```

`VOICECAST_URL` is the tenant base URL without `/api` or a trailing slash.

```python
import os
from voicecast_client import VoiceCastClient

client = VoiceCastClient(
    os.environ["VOICECAST_URL"],
    os.environ["VOICECAST_API_KEY"],
)
```

The client requires HTTPS, verifies TLS certificates, refuses redirects, and
uses a 20-second timeout by default. Pass `timeout=30` to change it.

## Place a call

```python
import os

call_uuid = client.place_call(
    callee="+31612345678",
    callflow=os.environ["VOICECAST_CALLFLOW"],
    parameters={
        "message": "This is a VoiceCast test call.",
        "alert_text": "This is a VoiceCast test call.",
        "customer_id": "customer-123",
    },
)
print(f"Queued VoiceCast call {call_uuid}")
```

The destination must use international E.164 format. Values in `parameters`
are available to the callflow as variables such as `{{message}}` and
`{{customer_id}}`. The client adds `source=python` unless you provide a
different source.

A returned UUID confirms that VoiceCast saved the call with `pending` status.
It does not mean the destination answered or the callflow completed.

## Schedule a call

Pass a timezone-aware `datetime` value:

```python
from datetime import datetime, timezone
import os

scheduled_uuid = client.place_call(
    "+31612345678",
    os.environ["VOICECAST_CALLFLOW"],
    {"message": "Your appointment starts in one hour."},
    scheduled_at=datetime(2030, 1, 15, 8, 30, tzinfo=timezone.utc),
)
```

Omit `scheduled_at` to make the call available to the dispatcher immediately.

## List callflows and check status

```python
callflows = client.list_callflows()
for callflow in callflows.get("callflows", []):
    print(callflow["name"], callflow["flow_uuid"])

call = client.get_call(call_uuid)
print(call)
```

Typical call states are `pending`, `processing`, `done`, `busy`, and `failed`.

## Error handling

```python
from voicecast_client import VoiceCastAPIError, VoiceCastError

try:
    call_uuid = client.place_call(
        "+31612345678",
        os.environ["VOICECAST_CALLFLOW"],
        {"message": "Service alert"},
    )
except ValueError as error:
    # Invalid local configuration, UUID, phone number, date, or parameters.
    print(error)
except VoiceCastAPIError as error:
    # VoiceCast returned an HTTP error. The status is available separately.
    print(f"VoiceCast rejected the request ({error.status})")
except VoiceCastError:
    # Transport failure, non-JSON response, or unexpected API response.
    print("VoiceCast request failed; inspect the application and Calls logs")
```

Common HTTP statuses are `400` for invalid call data, `401` for an invalid API
key, `404` for an unknown tenant or call, and `423` when outbound calling is
suspended by high-usage protection.

The client deliberately does not retry. If a create request times out,
VoiceCast may already have saved it; check Calls before submitting another
call to avoid duplicates.

## Security notes

- Store the API key in a secret manager or protected environment variable.
- Do not log request headers, the API key, or sensitive call parameters.
- Keep TLS verification enabled and use a tenant URL you trust.
- Give each environment its own API key so it can be rotated independently.

This community integration is provided as source code and is not an official
Python Software Foundation package or endorsement.
