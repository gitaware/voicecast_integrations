"""VoiceCast operator for Apache Airflow 2 and 3."""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone
from airflow.models import BaseOperator
from airflow.providers.http.hooks.http import HttpHook

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)

class VoiceCastOperator(BaseOperator):
    template_fields = ("callee", "callflow", "message")
    def __init__(self, *, callee: str, callflow: str, message: str, http_conn_id: str = "voicecast", **kwargs):
        super().__init__(**kwargs); self.callee=callee; self.callflow=callflow; self.message=message; self.http_conn_id=http_conn_id
    def execute(self, context):
        if not re.match(r"^\+[1-9][0-9]{6,14}$", self.callee): raise ValueError("callee must be E.164")
        if not UUID.match(self.callflow) or not self.message.strip(): raise ValueError("valid callflow and message are required")
        hook = HttpHook(method="POST", http_conn_id=self.http_conn_id)
        connection = hook.get_connection(self.http_conn_id)
        if not hook.base_url.lower().startswith("https://") or not connection.password:
            raise ValueError("VoiceCast connection requires an HTTPS host and API key password")
        headers = {"Authorization": "Bearer " + (connection.password or ""), "Content-Type": "application/json"}
        data = {"callee":self.callee,"callflow":self.callflow,"calldate":datetime.now(timezone.utc).isoformat(),"parameters":{"message":self.message,"alert_text":self.message,"source":"airflow"}}
        response = hook.run(endpoint="api/call/v2", data=json.dumps(data), headers=headers, extra_options={"check_response":False,"allow_redirects":False,"timeout":20})
        result = response.json() if response.status_code == 201 else {}
        if result.get("success") is not True or not UUID.match(result.get("data",{}).get("call_uuid","")): raise RuntimeError("VoiceCast did not confirm the call; check Calls v2 before retrying")
        return result["data"]["call_uuid"]
