<?php

declare(strict_types=1);

namespace VoiceCast;

use DateTimeInterface;
use JsonException;
use RuntimeException;

final class VoiceCastException extends RuntimeException
{
}

/**
 * Small, dependency-free client for the VoiceCast Calls v2 API.
 *
 * Copy this file into a PHP 8.1+ project and configure it with the HTTPS URL
 * of a VoiceCast tenant and a bearer API key.
 */
final class VoiceCastClient
{
    private const UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
    private const E164_PATTERN = '/^\+[1-9][0-9]{6,14}$/';

    /** @var callable(string, string, array<int, string>, ?string, int): array{status:int,body:string} */
    private $transport;
    private string $baseUrl;
    private string $apiKey;

    /**
     * @param null|callable(string, string, array<int, string>, ?string, int): array{status:int,body:string} $transport
     */
    public function __construct(
        string $baseUrl,
        string $apiKey,
        private int $timeoutSeconds = 20,
        ?callable $transport = null,
    ) {
        $this->baseUrl = self::validateBaseUrl($baseUrl);
        $this->apiKey = self::validateApiKey($apiKey);
        if ($timeoutSeconds < 1 || $timeoutSeconds > 120) {
            throw new \InvalidArgumentException('Timeout must be between 1 and 120 seconds.');
        }
        $this->transport = $transport ?? [$this, 'curlTransport'];
    }

    /**
     * Queue an immediate or scheduled outbound call and return its UUID.
     *
     * @param array<string, mixed> $parameters Variables available to the callflow.
     */
    public function placeCall(
        string $callee,
        string $callflow,
        array $parameters = [],
        ?DateTimeInterface $scheduledAt = null,
    ): string {
        $callee = trim($callee);
        $callflow = trim($callflow);
        if (preg_match(self::E164_PATTERN, $callee) !== 1) {
            throw new \InvalidArgumentException('Callee must be an international E.164 number.');
        }
        self::assertUuid($callflow, 'Callflow');

        $parameters += ['source' => 'php'];
        $payload = [
            'callee' => $callee,
            'callflow' => $callflow,
            'parameters' => $parameters,
        ];
        if ($scheduledAt !== null) {
            $payload['calldate'] = $scheduledAt->format(DateTimeInterface::ATOM);
        }

        $result = $this->request('POST', '/api/call/v2', $payload, 201);
        $callUuid = $result['data']['call_uuid'] ?? null;
        if (($result['success'] ?? null) !== true || !is_string($callUuid)
            || preg_match(self::UUID_PATTERN, $callUuid) !== 1) {
            throw new VoiceCastException('VoiceCast returned an unexpected call creation response.');
        }

        return $callUuid;
    }

    /** @return array<string, mixed> */
    public function getCall(string $callUuid): array
    {
        self::assertUuid($callUuid, 'Call UUID');
        return $this->request('GET', '/api/call/v2/' . rawurlencode($callUuid), null, 200);
    }

    /** @return array<string, mixed> */
    public function listCallflows(): array
    {
        return $this->request('GET', '/api/callflows?direction=outbound', null, 200);
    }

    /**
     * @param array<string, mixed>|null $payload
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $payload, int $expectedStatus): array
    {
        try {
            $body = $payload === null
                ? null
                : json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } catch (JsonException $e) {
            throw new \InvalidArgumentException('Parameters must be JSON serializable.', 0, $e);
        }

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Accept: application/json',
            'User-Agent: voicecast-php/1.0',
        ];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json; charset=utf-8';
        }

        try {
            $response = ($this->transport)(
                $method,
                $this->baseUrl . $path,
                $headers,
                $body,
                $this->timeoutSeconds,
            );
        } catch (VoiceCastException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new VoiceCastException(
                'VoiceCast could not be reached; check Calls v2 before retrying a create request.',
                0,
                $e,
            );
        }

        $status = $response['status'] ?? 0;
        $rawBody = $response['body'] ?? '';
        if (!is_int($status) || !is_string($rawBody)) {
            throw new VoiceCastException('The VoiceCast transport returned an invalid response.');
        }

        try {
            $decoded = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new VoiceCastException('VoiceCast returned invalid JSON.', $status, $e);
        }
        if (!is_array($decoded)) {
            throw new VoiceCastException('VoiceCast returned an unexpected JSON response.', $status);
        }
        if ($status !== $expectedStatus) {
            $message = $decoded['error'] ?? $decoded['message'] ?? 'VoiceCast API request failed.';
            $message = is_string($message) ? substr($message, 0, 300) : 'VoiceCast API request failed.';
            throw new VoiceCastException($message, $status);
        }

        return $decoded;
    }

    /** @return array{status:int,body:string} */
    private function curlTransport(
        string $method,
        string $url,
        array $headers,
        ?string $body,
        int $timeoutSeconds,
    ): array {
        if (!function_exists('curl_init')) {
            throw new VoiceCastException('The PHP cURL extension is required.');
        }
        $handle = curl_init($url);
        if ($handle === false) {
            throw new VoiceCastException('Could not initialize the HTTPS request.');
        }
        curl_setopt_array($handle, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => min(10, $timeoutSeconds),
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        if ($body !== null) {
            curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
        }
        $responseBody = curl_exec($handle);
        $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if (!is_string($responseBody)) {
            throw new VoiceCastException('VoiceCast HTTPS request failed: ' . $error);
        }

        return ['status' => $status, 'body' => $responseBody];
    }

    private static function validateBaseUrl(string $baseUrl): string
    {
        $baseUrl = rtrim(trim($baseUrl), '/');
        $parts = parse_url($baseUrl);
        $path = is_array($parts) ? (string)($parts['path'] ?? '') : '';
        if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['query']) || isset($parts['fragment'])
            || preg_match('#/api(?:/|$)#i', $path) === 1) {
            throw new \InvalidArgumentException(
                'Base URL must be an HTTPS tenant URL without credentials, query, fragment or API path.',
            );
        }

        return $baseUrl;
    }

    private static function validateApiKey(string $apiKey): string
    {
        $apiKey = trim($apiKey);
        if ($apiKey === '' || preg_match('/[\r\n]/', $apiKey) === 1) {
            throw new \InvalidArgumentException('API key is required and may not contain newlines.');
        }
        return $apiKey;
    }

    private static function assertUuid(string $value, string $label): void
    {
        if (preg_match(self::UUID_PATTERN, $value) !== 1) {
            throw new \InvalidArgumentException($label . ' must be a valid UUID.');
        }
    }
}
