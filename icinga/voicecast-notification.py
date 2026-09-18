#!/usr/bin/env python3
"""Queue an Icinga notification in VoiceCast. Python standard library only."""

import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


UUID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}", re.I)


class NotificationError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward the bearer token to a redirect target.
        return None


def configuration(path):
    try:
        with open(path, encoding="utf-8") as handle:
            config = json.load(handle)
    except (OSError, ValueError):
        raise NotificationError("Cannot read configuration JSON; check path, permissions and syntax.") from None
    if not isinstance(config, dict):
        raise NotificationError("Configuration must be a JSON object.")
    for key in ("url", "api_key", "callflow"):
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise NotificationError("Configure " + key + ".")
        config[key] = config[key].strip()
    url = config["url"].rstrip("/")
    try:
        parsed = urllib.parse.urlsplit(url)
        valid = (parsed.scheme == "https" and parsed.hostname and not parsed.username
                 and not parsed.password and not parsed.query and not parsed.fragment
                 and not re.search(r"\s", url) and parsed.port != 0)
    except ValueError:
        valid = False
    if not valid or re.search(r"/api(?:/|$)", parsed.path, re.I):
        raise NotificationError("url must be an HTTPS tenant base URL without credentials, query, fragment or /api.")
    if not re.fullmatch(r"[\x21-\x7e]+", config["api_key"]):
        raise NotificationError("api_key must contain only printable non-space ASCII characters.")
    if not UUID.fullmatch(config["callflow"]):
        raise NotificationError("callflow must be a UUID.")
    config["url"] = url
    return config


def message_from_event(env):
    host = env.get("VOICECAST_HOST", "").strip()
    state = env.get("VOICECAST_STATE", "").strip()
    kind = env.get("VOICECAST_TYPE", "").strip()
    if not host or not state or not kind:
        raise NotificationError("Missing notification type, host or state from Icinga.")
    service = env.get("VOICECAST_SERVICE", "").strip()
    output = env.get("VOICECAST_OUTPUT", "").strip()
    message = "Icinga {0}. Host {1}. ".format(kind, host)
    if service:
        message += "Service {0}. ".format(service)
    message += "State {0}.".format(state)
    if output:
        message += " " + output
    return message


def payload(config, recipient, message):
    if not re.fullmatch(r"\+[1-9][0-9]{6,14}", recipient):
        raise NotificationError("Recipient must be one international phone number, for example +31612345678.")
    if not message.strip():
        raise NotificationError("Message cannot be empty.")
    return {
        "callee": recipient,
        "callflow": config["callflow"],
        "calldate": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "parameters": {"message": message.strip(), "alert_text": message.strip(), "source": "icinga"},
    }


def send(config, data, opener=None):
    request = urllib.request.Request(
        config["url"] + "/api/call/v2",
        data=json.dumps(data, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + config["api_key"]},
        method="POST",
    )
    opener = opener or urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=20) as response:
            if response.status != 201:
                raise NotificationError("API returned HTTP {0}; check call history before retrying.".format(response.status))
            # Bound the response; only the call UUID is needed.
            body = json.loads(response.read(65537))
    except urllib.error.HTTPError as error:
        raise NotificationError("API returned HTTP {0}; check configuration and call history before retrying.".format(error.code)) from None
    except (OSError, ValueError, urllib.error.URLError):
        raise NotificationError("Request failed or API response was invalid; check connectivity, TLS and call history before retrying.") from None
    if (not isinstance(body, dict) or body.get("success") is not True
            or not isinstance(body.get("data"), dict)
            or not isinstance(body["data"].get("call_uuid"), str)
            or not UUID.fullmatch(body["data"]["call_uuid"])):
        raise NotificationError("API did not confirm call creation; check call history before retrying.")
    return body["data"]["call_uuid"]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="/etc/icinga2/voicecast.json")
    parser.add_argument("--to", help="Test recipient; normally supplied through VOICECAST_TO")
    parser.add_argument("--message", help="Test message; normally built from Icinga event variables")
    parser.add_argument("--dry-run", action="store_true", help="Validate settings and payload without calling VoiceCast")
    args = parser.parse_args(argv)
    try:
        config = configuration(args.config)
        recipient = args.to if args.to is not None else os.environ.get("VOICECAST_TO", "")
        message = args.message if args.message is not None else message_from_event(os.environ)
        data = payload(config, recipient.strip(), message)
        if args.dry_run:
            print("VoiceCast: configuration and notification validated; no call sent.")
        else:
            print("Queued VoiceCast call " + send(config, data))
        return 0
    except NotificationError as error:
        print("VoiceCast: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
