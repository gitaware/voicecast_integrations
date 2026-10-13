#!/usr/bin/env php
<?php

declare(strict_types=1);

require __DIR__ . '/VoiceCastClient.php';

use VoiceCast\VoiceCastClient;

function checkPhpClient(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$request = [];
$transport = static function (
    string $method,
    string $url,
    array $headers,
    ?string $body,
    int $timeout,
) use (&$request): array {
    $request = compact('method', 'url', 'headers', 'body', 'timeout');
    return [
        'status' => 201,
        'body' => json_encode([
            'success' => true,
            'data' => ['call_uuid' => '550e8400-e29b-41d4-a716-446655440000', 'status' => 'pending'],
        ], JSON_THROW_ON_ERROR),
    ];
};

$client = new VoiceCastClient('https://voicecast.example.com/', 'test-api-key', 15, $transport);
$uuid = $client->placeCall(
    '+31612345678',
    '123e4567-e89b-42d3-a456-426614174000',
    ['message' => 'Test'],
    new DateTimeImmutable('2030-01-15T09:30:00+01:00'),
);
$payload = json_decode((string)$request['body'], true, 512, JSON_THROW_ON_ERROR);
checkPhpClient($uuid === '550e8400-e29b-41d4-a716-446655440000', 'Call UUID was not returned');
checkPhpClient($request['method'] === 'POST', 'Wrong request method');
checkPhpClient($request['url'] === 'https://voicecast.example.com/api/call/v2', 'Wrong endpoint');
checkPhpClient(in_array('Authorization: Bearer test-api-key', $request['headers'], true), 'Bearer header missing');
checkPhpClient($payload['parameters']['source'] === 'php', 'Source parameter missing');
checkPhpClient($payload['calldate'] === '2030-01-15T09:30:00+01:00', 'Schedule was not serialized');

foreach ([
    static fn() => new VoiceCastClient('http://voicecast.example.com', 'key'),
    static fn() => $client->placeCall('0612345678', '123e4567-e89b-42d3-a456-426614174000'),
] as $invalid) {
    try {
        $invalid();
        throw new RuntimeException('Invalid input was accepted');
    } catch (InvalidArgumentException) {
    }
}

echo "PHP VoiceCast client passed.\n";
