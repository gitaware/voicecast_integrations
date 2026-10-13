"""Dependency-free Python client for the VoiceCast Calls v2 API."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


UUID = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
E164 = re.compile(r"^\+[1-9][0-9]{6,14}$")


class VoiceCastError(RuntimeError):
    """Base exception for VoiceCast validation, transport, and API errors."""


class VoiceCastAPIError(VoiceCastError):
    """An API request completed with an unexpected HTTP status."""

    def __init__(self, message: str, status: int):
        super().__init__(message)
        self.status = status


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


class VoiceCastClient:
    """Client for queueing and inspecting VoiceCast Calls v2 calls."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        timeout: float = 20.0,
        opener: Any | None = None,
    ) -> None:
        self.base_url = self._validate_base_url(base_url)
        self.api_key = self._validate_api_key(api_key)
        if not 0 < timeout <= 120:
            raise ValueError("timeout must be between 0 and 120 seconds")
        self.timeout = timeout
        self._opener = opener or build_opener(_NoRedirect())

    def place_call(
        self,
        callee: str,
        callflow: str,
        parameters: Mapping[str, Any] | None = None,
        *,
        scheduled_at: datetime | None = None,
    ) -> str:
        """Queue a call and return the new call UUID.

        Omit ``scheduled_at`` to make the call available to the dispatcher
        immediately. Scheduled datetimes must include a timezone.
        """

        callee = callee.strip()
        callflow = callflow.strip()
        if not E164.fullmatch(callee):
            raise ValueError("callee must be an international E.164 number")
        self._validate_uuid(callflow, "callflow")

        call_parameters = dict(parameters or {})
        call_parameters.setdefault("source", "python")
        payload: dict[str, Any] = {
            "callee": callee,
            "callflow": callflow,
            "parameters": call_parameters,
        }
        if scheduled_at is not None:
            if scheduled_at.tzinfo is None or scheduled_at.utcoffset() is None:
                raise ValueError("scheduled_at must include a timezone")
            payload["calldate"] = scheduled_at.isoformat()

        result = self._request("POST", "/api/call/v2", payload, expected_status=201)
        call_uuid = result.get("data", {}).get("call_uuid")
        if result.get("success") is not True or not isinstance(call_uuid, str) or not UUID.fullmatch(call_uuid):
            raise VoiceCastError("VoiceCast returned an unexpected call creation response")
        return call_uuid

    def get_call(self, call_uuid: str) -> dict[str, Any]:
        """Return the Calls v2 record for a call UUID."""

        self._validate_uuid(call_uuid, "call_uuid")
        return self._request("GET", "/api/call/v2/" + quote(call_uuid), expected_status=200)

    def list_callflows(self) -> dict[str, Any]:
        """Return outbound callflows available to the API key's tenant."""

        return self._request("GET", "/api/callflows?direction=outbound", expected_status=200)

    def _request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, Any] | None = None,
        *,
        expected_status: int,
    ) -> dict[str, Any]:
        try:
            body = None if payload is None else json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        except (TypeError, ValueError) as exc:
            raise ValueError("parameters must be JSON serializable") from exc

        headers = {
            "Authorization": "Bearer " + self.api_key,
            "Accept": "application/json",
            "User-Agent": "voicecast-python/1.0",
        }
        if body is not None:
            headers["Content-Type"] = "application/json; charset=utf-8"
        request = Request(self.base_url + path, data=body, headers=headers, method=method)

        try:
            response = self._opener.open(request, timeout=self.timeout)
            try:
                status = int(response.getcode())
                raw_body = response.read().decode("utf-8")
            finally:
                response.close()
        except HTTPError as exc:
            status = exc.code
            raw_body = exc.read().decode("utf-8", errors="replace")
            exc.close()
        except (URLError, TimeoutError, OSError) as exc:
            raise VoiceCastError(
                "VoiceCast could not be reached; check Calls v2 before retrying a create request"
            ) from exc

        try:
            result = json.loads(raw_body)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise VoiceCastError("VoiceCast returned invalid JSON") from exc
        if not isinstance(result, dict):
            raise VoiceCastError("VoiceCast returned an unexpected JSON response")
        if status != expected_status:
            message = result.get("error") or result.get("message") or "VoiceCast API request failed"
            if not isinstance(message, str):
                message = "VoiceCast API request failed"
            raise VoiceCastAPIError(message[:300], status)
        return result

    @staticmethod
    def _validate_base_url(base_url: str) -> str:
        base_url = base_url.strip().rstrip("/")
        parsed = urlsplit(base_url)
        if (
            parsed.scheme.lower() != "https"
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
            or re.search(r"/api(?:/|$)", parsed.path, re.IGNORECASE)
        ):
            raise ValueError(
                "base_url must be an HTTPS tenant URL without credentials, query, fragment, or API path"
            )
        return base_url

    @staticmethod
    def _validate_api_key(api_key: str) -> str:
        api_key = api_key.strip()
        if not api_key or "\r" in api_key or "\n" in api_key:
            raise ValueError("api_key is required and may not contain newlines")
        return api_key

    @staticmethod
    def _validate_uuid(value: str, label: str) -> None:
        if not UUID.fullmatch(value):
            raise ValueError(f"{label} must be a valid UUID")
