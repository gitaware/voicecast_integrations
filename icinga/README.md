<img src="images/logo_no_eu_dark_background.png" alt="VoiceCast" width="280">

# VoiceCast integration for Icinga 2

Turn Icinga host and service notifications into automated phone calls.
This integration queues a call in VoiceCast and passes the notification text
to the callflow configured for you by CloudAware. Icinga controls recipients and event
filters; VoiceCast handles the call.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**.
Contact: [voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Features

- Host and service notifications for problems, recoveries and custom tests.
- One phone call per recipient notification, with spoken event type, host,
  service (when applicable), state and check output.
- VoiceCast callflows and text-to-speech configured for you by CloudAware.
- HTTPS with API-key authentication; credentials stay in a local JSON file.
- No external Python packages, npm packages or Composer packages needed.
- Dry-run validation without placing a call.

This is an **Icinga 2 NotificationCommand integration**. It is not an Icinga Web
module, Icinga 1 plugin or a plugin for the separate Icinga Notifications product.
Configuration is supplied as Icinga 2 DSL, not a Director import bundle.

## Requirements

- Icinga 2 with the notification feature enabled and permission to install
  scripts/configuration on its notification-executing nodes.
- Python 3.8 or newer at `/usr/bin/python3`.
- A VoiceCast account and the tenant URL, API key and callflow UUID supplied
  by CloudAware.
- HTTPS access from the notification node to the tenant, trusted certificates
  and synchronized server clocks.

Icinga configuration validation and live delivery must be checked on your own
installation. No Icinga release is claimed as end-to-end certified.

## 1. Register for VoiceCast

1. Create a VoiceCast account by contacting
   [voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).
2. CloudAware will configure the callflow for you, including language, retries,
   webhooks and other agreed settings.
3. You will receive the tenant URL, API key and callflow UUID needed to configure
   the Icinga integration.

You do not need to create or edit callflows or configure VoiceCast's call
processing. Contact CloudAware if you want to change your voice or call behavior.

## 2. Install the files

Download [voicecast-notification.py](voicecast-notification.py),
[voicecast.conf](voicecast.conf) and
[voicecast.json.example](voicecast.json.example). Run these commands from the
directory containing the downloaded files. Adjust the group `icinga` if your
installation uses another daemon account (for example `nagios`).

```bash
sudo install -d -m 0755 /etc/icinga2/scripts
sudo install -m 0755 voicecast-notification.py /etc/icinga2/scripts/voicecast-notification.py
sudo install -o root -g icinga -m 0640 voicecast.json.example /etc/icinga2/voicecast.json
sudo install -m 0644 voicecast.conf /etc/icinga2/conf.d/voicecast.conf
```

The last command assumes your `icinga2.conf` includes `conf.d`. If you manage
configuration through zones or Director, deploy the equivalent command, user
and notification objects through that configuration source instead. Do not
define the same objects twice. In HA setups, install the script and credentials
on **every node that can execute notifications**; Icinga config synchronization
does not deploy these files for you.

## 3. Configure credentials and the recipient

Edit `/etc/icinga2/voicecast.json`:

```json
{
  "url": "https://voicecast.example.com",
  "api_key": "YOUR_VOICECAST_API_KEY",
  "callflow": "550e8400-e29b-41d4-a716-446655440000"
}
```

Replace all three example values with the values supplied by CloudAware after
registration. Use the supplied HTTPS base URL without `/api`. Keep the file readable by the
Icinga daemon but not other users; never commit real credentials to GitHub.

In `voicecast.conf`, change `vars.voicecast_phone` on the `voicecast-oncall`
User to your recipient's international number, for example `+31612345678`.
For multiple recipients, create additional User objects with that variable
and list their names in the notification rules' `users` arrays. Alternatively,
set `user_groups` to your configured UserGroups. Use one phone number per user.

## 4. Select hosts and services

The example rules are **opt-in**: importing them alone does not assign calls
to every host or service. Add this variable to each Host or Service object
that should generate voice notifications:

```icinga2
vars.voicecast_notifications = true
```

Host opt-in enables host notifications only. Service notifications require the
variable on the **Service** object. Host notifications include Up/Down states;
service notifications include OK/Warning/Critical/Unknown. To notify only for
Critical services and their recoveries, change the service rule to:

```icinga2
states = [ OK, Critical ]
```

The default types are `Problem`, `Recovery` and `Custom`. Remove `Recovery`
if you do not want recovery calls. `Custom` enables manual test notifications.
`interval = 0` disables periodic repeat notifications; distinct events and
custom notifications can still create additional calls.

The example has no time-period restriction. Add your existing time-period name
to the notification rules or users when required. Ensure notifications are
enabled globally and on the chosen hosts, services and users.

Validate before reloading:

```bash
sudo icinga2 feature enable notification
sudo icinga2 daemon -C
sudo systemctl reload icinga2
```

Only reload if validation succeeds. Follow your platform's service-management
procedure if it does not use systemd.

## 5. Test

First validate as the Icinga daemon user without sending a call (adjust `icinga`
to your actual service user):

```bash
sudo -u icinga /usr/bin/python3 /etc/icinga2/scripts/voicecast-notification.py \
  --to +31612345678 --message "This is a VoiceCast test." --dry-run
```

This checks configuration and payload construction, not connectivity or API
credentials. Remove `--dry-run` to queue a **real phone call**:

```bash
sudo -u icinga /usr/bin/python3 /etc/icinga2/scripts/voicecast-notification.py \
  --to +31612345678 --message "This is a VoiceCast test."
```

Success prints `Queued VoiceCast call <uuid>` and exits with status 0. Errors
exit with status 1. Check that UUID in VoiceCast's call history and confirm
the phone rings and reads your message.

To check the Icinga rule and runtime macros, select an opted-in host or service
in Icinga Web and use its **Send custom notification** action (wording and
availability depend on the installed web module and permissions). The supplied
rules allow `Custom` notifications. These speak the current state and check
output; the custom comment is not included. This action may also activate other
notification methods assigned to the object.

Finally test a controlled problem and recovery on a test object. Normal problem
notifications depend on hard states, notification filters, downtime and
acknowledgement settings. A successful manual script test does not validate
these rules.

## Message format

For a service problem, the generated message is similar to:

```text
Icinga Problem. Host Database server. Service Disk. State Critical. Disk space is low.
```

The integration supplies the message to your CloudAware-configured callflow
automatically. No VoiceCast placeholders need to be configured by Icinga users.

There is no subject. Edit `message_from_event()` in the Python script to change
the wording. Check output is sent to VoiceCast and spoken, so keep it concise
and avoid sensitive information in that output.

The Icinga command passes event values through environment variables, not shell
interpolation: `VOICECAST_TO`, `VOICECAST_TYPE`, `VOICECAST_HOST`,
`VOICECAST_SERVICE` (services only), `VOICECAST_STATE` and `VOICECAST_OUTPUT`.
The API key is read from the configuration file, not supplied on the command line.

## Delivery and troubleshooting

**Queued does not mean answered.** The script posts an explicit UTC schedule
to queue the call and returns without waiting for a person to answer. Failed
or unanswered calls do not update Icinga's notification result, and keypad
input does not acknowledge the Icinga problem.

The script makes one request, with a 20-second socket timeout; Icinga limits the
whole command to 30 seconds. There are no automatic script retries. A timeout
or lost response may occur after the call was saved. Check VoiceCast history
before retrying, because the API provides no idempotency key.

These request settings are separate from any call retries CloudAware configures
in your VoiceCast callflow.

| Issue | Check |
| --- | --- |
| Cannot read configuration | JSON syntax, path, directory access and daemon user/group permissions. |
| HTTP 401 | Copy the API key supplied by CloudAware; contact CloudAware if it is still rejected. |
| HTTP 400 | International destination number and the callflow UUID supplied by CloudAware. |
| HTTP 404 | Copy the tenant base URL supplied by CloudAware; contact CloudAware if the API remains unavailable. |
| TLS/network error | Connectivity and certificate trust from the notification node. Redirects are deliberately rejected. |
| Queued but no call | Check the Icinga server clock and contact CloudAware with the returned call UUID to investigate delivery. |
| Silence or literal placeholder | Contact CloudAware with the call UUID so the configured callflow can be checked. |
| Script works but Icinga sends no call | Loaded apply rules, opt-in variables, notification feature, users, states, types, time periods, downtime and hard-state transition. |

Inspect Icinga logs and VoiceCast call history for diagnosis. Errors intentionally
omit raw HTTP response bodies and credentials. Python's standard HTTPS proxy
environment settings are supported if supplied to the notification process;
the script does not disable certificate verification.

## References and contact

- [Icinga notification commands and apply rules](https://icinga.com/docs/icinga-2/latest/doc/03-monitoring-basics/#notification-commands)
- [Icinga object types](https://icinga.com/docs/icinga-2/latest/doc/09-object-types/)
- [VoiceCast enquiries](mailto:voicecast@cloudaware.eu)

This integration does not imply endorsement or certification by Icinga.
