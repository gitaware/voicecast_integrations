<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Apache Airflow

Queue spoken telephone notifications from Airflow DAGs. The supplied operator
uses an Airflow HTTP Connection for the tenant URL and API key, supports Jinja
templates, and returns the VoiceCast call UUID through XCom.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- Apache Airflow 2 or 3 with `apache-airflow-providers-http` installed.
- HTTPS access from Airflow workers to the VoiceCast tenant.
- A VoiceCast tenant URL, API key and callflow UUID supplied by CloudAware.
- A running VoiceCast dispatcher and a callflow configured for spoken text.

## Installation

Copy [voicecast_operator.py](voicecast_operator.py) into a directory importable
by your DAGs, such as the DAG folder or an Airflow plugin package. Create an
HTTP Connection named `voicecast`:

| Connection field | Value |
| --- | --- |
| Connection ID | `voicecast` or the value passed as `http_conn_id` |
| Connection Type | HTTP |
| Host | Tenant HTTPS base URL, without `/api` |
| Password | VoiceCast API key |

Restrict access to this Connection or use your configured Airflow secrets
backend. Do not place the API key in DAG source.

```python
from voicecast_operator import VoiceCastOperator

notify = VoiceCastOperator(
    task_id="call_on_call_engineer",
    callee="{{ var.value.on_call_phone }}",
    callflow="550e8400-e29b-41d4-a716-446655440000",
    message="DAG {{ dag.dag_id }} failed in task {{ task_instance.task_id }}.",
    http_conn_id="voicecast",
)
```

## Tunable parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `callee` | Yes | One E.164 number, such as `+31612345678`. |
| `callflow` | Yes | VoiceCast callflow UUID. |
| `message` | Yes | Text supplied as `message` and `alert_text`. |
| `http_conn_id` | No | Airflow HTTP Connection; defaults to `voicecast`. |
| Standard operator arguments | No | `retries`, pools, trigger rules and other `BaseOperator` options. Avoid retries unless duplicate calls are acceptable. |

The three call fields are templated. The operator queues one call with an
explicit UTC timestamp and returns its UUID. **Success means queued, not
answered.** After a timeout, inspect Calls before clearing or retrying the
task because VoiceCast may already have saved the call.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Connection error | Connection ID, HTTPS Host, worker connectivity and TLS trust. |
| HTTP 401 | API key stored in the Connection Password. |
| HTTP 400 | E.164 destination and tenant-owned callflow UUID. |
| Queued but no call | VoiceCast dispatcher, call status and callflow configuration. |

This integration does not imply endorsement or certification by Apache Airflow.
