# VoiceCast PHP client

Use the dependency-free `VoiceCastClient` class to queue immediate or scheduled
VoiceCast calls from PHP, retrieve call status, and list available outbound
callflows.

VoiceCast is provided by **CloudAware, The Hague, The Netherlands**. Contact:
[voicecast@cloudaware.eu](mailto:voicecast@cloudaware.eu).

## Requirements

- PHP 8.1 or newer.
- The PHP cURL and JSON extensions.
- A VoiceCast tenant HTTPS URL, API key, and outbound callflow UUID.
- A running VoiceCast dispatcher for call execution.

Create or replace the API key from your VoiceCast profile. You can copy a
callflow UUID from VoiceCast or call `listCallflows()` after configuration.

## Installation

Copy `VoiceCastClient.php` into your project and load it directly:

```php
require __DIR__ . '/VoiceCastClient.php';

use VoiceCast\VoiceCastClient;
```

You may instead place the file under a PSR-4 mapping for the `VoiceCast\`
namespace. The class has no Composer package dependencies.

## Configuration

Keep credentials in environment variables or a secret manager, never in source
control:

```bash
export VOICECAST_URL='https://voicecast.example.com'
export VOICECAST_API_KEY='replace-with-your-api-key'
export VOICECAST_CALLFLOW='550e8400-e29b-41d4-a716-446655440000'
```

`VOICECAST_URL` is the tenant base URL without `/api` or a trailing slash.

```php
$client = new VoiceCastClient(
    getenv('VOICECAST_URL') ?: '',
    getenv('VOICECAST_API_KEY') ?: '',
);
```

The client requires HTTPS, verifies TLS certificates, refuses redirects, and
uses a 20-second timeout by default. Pass `timeoutSeconds: 30` to change it.

## Place a call

```php
$callUuid = $client->placeCall(
    callee: '+31612345678',
    callflow: getenv('VOICECAST_CALLFLOW') ?: '',
    parameters: [
        'message' => 'This is a VoiceCast test call.',
        'alert_text' => 'This is a VoiceCast test call.',
        'customer_id' => 'customer-123',
    ],
);

printf("Queued VoiceCast call %s\n", $callUuid);
```

The destination must use international E.164 format. Values in `parameters`
are available to the callflow as variables such as `{{message}}` and
`{{customer_id}}`. The client adds `source=php` unless you provide a different
source.

A returned UUID confirms that VoiceCast saved the call with `pending` status.
It does not mean the destination answered or the callflow completed.

## Schedule a call

Pass a timezone-aware `DateTimeInterface` value:

```php
$scheduledUuid = $client->placeCall(
    '+31612345678',
    getenv('VOICECAST_CALLFLOW') ?: '',
    ['message' => 'Your appointment starts in one hour.'],
    new DateTimeImmutable('2030-01-15T09:30:00+01:00'),
);
```

Omit the date to make the call available to the dispatcher immediately.

## List callflows and check status

```php
$callflows = $client->listCallflows();
foreach ($callflows['callflows'] ?? [] as $callflow) {
    printf("%s: %s\n", $callflow['name'], $callflow['flow_uuid']);
}

$call = $client->getCall($callUuid);
print_r($call);
```

Typical call states are `pending`, `processing`, `done`, `busy`, and `failed`.

## Error handling

```php
use VoiceCast\VoiceCastException;

try {
    $callUuid = $client->placeCall(
        '+31612345678',
        getenv('VOICECAST_CALLFLOW') ?: '',
        ['message' => 'Service alert'],
    );
} catch (InvalidArgumentException $error) {
    // Invalid local configuration, UUID, phone number, or parameters.
} catch (VoiceCastException $error) {
    // Transport failure, non-JSON response, or VoiceCast API error.
    error_log('VoiceCast request failed with code ' . $error->getCode());
}
```

Common HTTP codes are `400` for invalid call data, `401` for an invalid API key,
`404` for an unknown tenant or call, and `423` when outbound calling is
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
PHP project package or endorsement.
