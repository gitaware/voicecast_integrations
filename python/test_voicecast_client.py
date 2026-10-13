"""Offline tests for the reusable VoiceCast Python client."""

import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from voicecast_client import VoiceCastClient


class FakeResponse:
    def __init__(self, payload, status=201):
        self.payload = json.dumps(payload).encode()
        self.status = status
        self.closed = False

    def getcode(self):
        return self.status

    def read(self):
        return self.payload

    def close(self):
        self.closed = True


class FakeOpener:
    def __init__(self):
        self.request = None
        self.timeout = None

    def open(self, request, timeout):
        self.request = request
        self.timeout = timeout
        return FakeResponse(
            {
                "success": True,
                "data": {
                    "call_uuid": "550e8400-e29b-41d4-a716-446655440000",
                    "status": "pending",
                },
            }
        )


class VoiceCastClientTests(unittest.TestCase):
    def test_place_call_contract(self):
        opener = FakeOpener()
        client = VoiceCastClient(
            "https://voicecast.example.com/", "test-api-key", timeout=15, opener=opener
        )
        call_uuid = client.place_call(
            "+31612345678",
            "123e4567-e89b-42d3-a456-426614174000",
            {"message": "Test"},
            scheduled_at=datetime(2030, 1, 15, 8, 30, tzinfo=timezone.utc),
        )
        payload = json.loads(opener.request.data)
        self.assertEqual(call_uuid, "550e8400-e29b-41d4-a716-446655440000")
        self.assertEqual(opener.request.full_url, "https://voicecast.example.com/api/call/v2")
        self.assertEqual(opener.request.method, "POST")
        self.assertEqual(opener.request.get_header("Authorization"), "Bearer test-api-key")
        self.assertEqual(payload["parameters"]["source"], "python")
        self.assertEqual(payload["calldate"], "2030-01-15T08:30:00+00:00")
        self.assertEqual(opener.timeout, 15)

    def test_rejects_insecure_url_and_invalid_number(self):
        with self.assertRaises(ValueError):
            VoiceCastClient("http://voicecast.example.com", "key")
        client = VoiceCastClient("https://voicecast.example.com", "key", opener=FakeOpener())
        with self.assertRaises(ValueError):
            client.place_call("0612345678", "123e4567-e89b-42d3-a456-426614174000")

    def test_schedule_requires_timezone(self):
        client = VoiceCastClient("https://voicecast.example.com", "key", opener=FakeOpener())
        with self.assertRaises(ValueError):
            client.place_call(
                "+31612345678",
                "123e4567-e89b-42d3-a456-426614174000",
                scheduled_at=datetime(2030, 1, 15, 8, 30),
            )


if __name__ == "__main__":
    unittest.main()
