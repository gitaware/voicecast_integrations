# Place VoiceCast calls with curl

Use `curl` to queue VoiceCast callflows from a terminal, shell script, cron job
or any system that can run a command. VoiceCast saves the call first and returns
immediately; its dispatcher places the telephone call asynchronously.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- `curl` with HTTPS support.
- A VoiceCast tenant URL, API key and callflow UUID.
- A running VoiceCast dispatcher and a configured outbound callflow.
- Network access to the tenant's HTTPS endpoint.

You can create or replace your API key from your VoiceCast profile. Find the
callflow UUID in VoiceCast or list the callflows with the API as shown below.

## Set the connection variables

Set these values in the shell that will run the request:

```bash
export VOICECAST_URL='https://voicecast.example.com'
export VOICECAST_CALLFLOW='550e8400-e29b-41d4-a716-446655440000'
read -rsp 'VoiceCast API key: ' VOICECAST_API_KEY && printf '\n'
export VOICECAST_API_KEY
```

`VOICECAST_URL` is the tenant base URL without `/api` or a trailing slash. Keep
the API key out of source control, command history and shared logs. For
automation, load it from the host's secret store or a protected environment
file instead of placing it directly in a script.

## List available callflows

```bash
curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header "Authorization: Bearer ${VOICECAST_API_KEY}" \
  --header 'Accept: application/json' \
  "${VOICECAST_URL}/api/callflows"
```

Use the `flow_uuid` of a callflow belonging to the authenticated tenant.

## Place a call now

```bash
curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${VOICECAST_API_KEY}" \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data "{
    \"callee\": \"+31612345678\",
    \"callflow\": \"${VOICECAST_CALLFLOW}\",
    \"parameters\": {
      \"message\": \"This is a VoiceCast test call.\",
      \"alert_text\": \"This is a VoiceCast test call.\",
      \"source\": \"curl\"
    }
  }" \
  "${VOICECAST_URL}/api/call/v2"
```

Use an international E.164 destination such as `+31612345678`. The names under
`parameters` are available to the callflow as variables, for example
`{{message}}`, `{{alert_text}}` and `{{source}}`. They only affect the callflow
when its blocks reference them.

A successful request returns HTTP `201 Created`:

```json
{
  "success": true,
  "message": "Call v2 queued",
  "data": {
    "call_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending"
  }
}
```

Success means the call was queued. It does not mean that the destination
answered or that the callflow completed.

## Schedule a call

Add `calldate` using an ISO 8601 timestamp with an explicit timezone. This
example schedules a call in UTC:

```bash
curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${VOICECAST_API_KEY}" \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data "{
    \"callee\": \"+31612345678\",
    \"callflow\": \"${VOICECAST_CALLFLOW}\",
    \"calldate\": \"2030-01-15T09:30:00Z\",
    \"parameters\": {
      \"message\": \"This is your scheduled reminder.\",
      \"source\": \"curl\"
    }
  }" \
  "${VOICECAST_URL}/api/call/v2"
```

Omit `calldate` to make the call available to the dispatcher immediately.

## Check the call status

Copy `data.call_uuid` from the create response:

```bash
export VOICECAST_CALL_UUID='replace-with-returned-call-uuid'

curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --header "Authorization: Bearer ${VOICECAST_API_KEY}" \
  --header 'Accept: application/json' \
  "${VOICECAST_URL}/api/call/v2/${VOICECAST_CALL_UUID}"
```

The main states are:

| Status | Meaning |
| --- | --- |
| `pending` | Waiting for its scheduled time or an available dispatcher worker. |
| `processing` | A worker owns the call and is executing the callflow. |
| `done` | Callflow execution finished. |
| `failed` | Validation, origination or callflow execution failed. |

If `jq` is installed, you can capture the UUID from a successful response:

```bash
response=$(curl --fail-with-body --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  --request POST \
  --header "Authorization: Bearer ${VOICECAST_API_KEY}" \
  --header 'Content-Type: application/json' \
  --data "{\"callee\":\"+31612345678\",\"callflow\":\"${VOICECAST_CALLFLOW}\"}" \
  "${VOICECAST_URL}/api/call/v2")

VOICECAST_CALL_UUID=$(printf '%s' "$response" | jq -er '.data.call_uuid')
printf 'Queued call %s\n' "$VOICECAST_CALL_UUID"
```

## Error handling and retries

| HTTP status | Meaning |
| --- | --- |
| `201` | Call saved with `pending` status. |
| `400` | Invalid number, missing field or inaccessible callflow. |
| `401` | Missing or invalid API key. |
| `404` | Tenant or requested call was not found. |
| `423` | Outbound calling is suspended by high-usage protection. |
| `500` | VoiceCast could not process the request. |

`--fail-with-body` makes curl return a nonzero exit code for HTTP errors while
preserving VoiceCast's JSON error response. Do not automatically retry a timed
out create request: VoiceCast may have saved the call before the connection was
lost, and the Calls v2 endpoint has no idempotency key. Check Calls or query the
known call UUID before placing another call.

This integration requires no files or dependencies beyond curl and does not
imply endorsement or certification by the curl project.
