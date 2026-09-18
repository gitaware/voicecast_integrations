"""Offline tests. No VoiceCast credentials or network access required."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location("voicecast", Path(__file__).with_name("voicecast-notification.py"))
vc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vc)
UUID = "550e8400-e29b-41d4-a716-446655440000"
CONFIG = {"url": "https://tenant.example.com", "api_key": "test-secret", "callflow": UUID}


class Response(io.BytesIO):
    status = 201


class Opener:
    def __init__(self, body=None, error=None, status=201):
        self.body = body if body is not None else json.dumps({"success": True, "data": {"call_uuid": UUID}}).encode()
        self.error = error
        self.status = status
        self.calls = []

    def open(self, request, timeout):
        self.calls.append((request, timeout))
        if self.error:
            raise self.error
        response = Response(self.body)
        response.status = self.status
        return response


class NotificationTests(unittest.TestCase):
    def config(self, **overrides):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "config.json"
            path.write_text(json.dumps(dict(CONFIG, **overrides)))
            return vc.configuration(path)

    def test_configuration(self):
        self.assertEqual(self.config(url=CONFIG["url"] + "/")["url"], CONFIG["url"])
        for override in [{"url": "http://example.com"}, {"url": "https://u:p@example.com"},
                         {"url": "https://example.com/api"}, {"url": "https://example.com?key=x"},
                         {"url": "https://[broken"}, {"api_key": "a\nb"}, {"callflow": "bad"}]:
            with self.subTest(override=override), self.assertRaises(vc.NotificationError):
                self.config(**override)

    def test_host_and_service_text(self):
        event = {"VOICECAST_HOST": "db", "VOICECAST_STATE": "Down", "VOICECAST_TYPE": "Problem"}
        self.assertEqual(vc.message_from_event(event), "Icinga Problem. Host db. State Down.")
        event.update(VOICECAST_SERVICE="Disk", VOICECAST_STATE="Critical", VOICECAST_OUTPUT='Full "disk"\n警告')
        self.assertIn('Service Disk. State Critical. Full "disk"\n警告', vc.message_from_event(event))
        with self.assertRaises(vc.NotificationError):
            vc.message_from_event({})

    def test_payload_and_post(self):
        data = vc.payload(CONFIG, "+31612345678", 'A "quoted" message\n警告')
        self.assertIn("+00:00", data["calldate"])
        self.assertEqual(data["parameters"], {"message": 'A "quoted" message\n警告',
                         "alert_text": 'A "quoted" message\n警告', "source": "icinga"})
        opener = Opener()
        self.assertEqual(vc.send(CONFIG, data, opener), UUID)
        request, timeout = opener.calls[0]
        self.assertEqual(timeout, 20)
        self.assertEqual(request.full_url, CONFIG["url"] + "/api/call/v2")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-secret")
        self.assertEqual(json.loads(request.data), data)

    def test_invalid_payload(self):
        for phone, text in [("0612345678", "test"), ("+31612345678,+31687654321", "test"), ("+31612345678", " ")]:
            with self.assertRaises(vc.NotificationError):
                vc.payload(CONFIG, phone, text)

    def test_response_failures_and_no_retries(self):
        cases = [Opener(body=b'not json test-secret'), Opener(body=b'null'),
                 Opener(body=b'{"success":false}'), Opener(status=200),
                 Opener(error=TimeoutError("test-secret")),
                 Opener(error=urllib.error.HTTPError("https://example.com", 401, "test-secret", {}, None))]
        for opener in cases:
            with self.assertRaises(vc.NotificationError) as caught:
                vc.send(CONFIG, {}, opener)
            self.assertNotIn("test-secret", str(caught.exception))
            self.assertEqual(len(opener.calls), 1)

    def test_redirects_rejected(self):
        self.assertIsNone(vc.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.example.com"))

    def test_dry_run_and_failure_exit(self):
        with patch.object(vc, "configuration", return_value=CONFIG), patch.object(vc, "send") as send:
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(vc.main(["--to", "+31612345678", "--message", "Test", "--dry-run"]), 0)
            send.assert_not_called()
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(vc.main(["--to", "bad", "--message", "Test"]), 1)


if __name__ == "__main__":
    unittest.main()
