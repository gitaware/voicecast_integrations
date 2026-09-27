param(
    [Parameter(Mandatory = $true)][string]$Message,
    [Parameter(Mandatory = $false)][string]$To,
    [Parameter(Mandatory = $false)][string]$ConfigPath = "$PSScriptRoot\voicecast.json",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Text) {
    [Console]::Error.WriteLine("VoiceCast: $Text")
    exit 1
}

try {
    if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) { throw 'configuration file not found' }
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    $uri = $null
    if (-not [Uri]::TryCreate([string]$config.url, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
        throw 'url must be an HTTPS base URL without credentials, query or fragment'
    }
    if ([string]$config.api_key -match "[\r\n]" -or [string]::IsNullOrWhiteSpace([string]$config.api_key)) {
        throw 'api_key is invalid'
    }
    if ([string]$config.callflow -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') {
        throw 'callflow must be a UUID'
    }
    if ([string]::IsNullOrWhiteSpace($To)) { $To = [string]$config.to }
    if ($To -notmatch '^\+[1-9][0-9]{6,14}$') { throw 'destination must be one international E.164 number' }
    if ([string]::IsNullOrWhiteSpace($Message)) { throw 'message is required' }

    $payload = @{
        callee = $To
        callflow = [string]$config.callflow
        calldate = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        parameters = @{
            message = $Message.Trim()
            alert_text = $Message.Trim()
            source = 'prtg'
        }
    }
    $endpoint = ([string]$config.url).TrimEnd('/') + '/api/call/v2'
    if ($DryRun) {
        Write-Output ($payload | ConvertTo-Json -Depth 4 -Compress)
        exit 0
    }

    $headers = @{ Authorization = 'Bearer ' + [string]$config.api_key }
    $response = Invoke-WebRequest -Uri $endpoint -Method Post -Headers $headers `
        -ContentType 'application/json; charset=utf-8' -Body ($payload | ConvertTo-Json -Depth 4) `
        -TimeoutSec 20 -MaximumRedirection 0 -UseBasicParsing
    if ($response.StatusCode -ne 201) {
        throw 'unexpected HTTP status; check Calls v2 before retrying'
    }
    $result = $response.Content | ConvertFrom-Json
    if ($result.success -ne $true -or [string]$result.data.call_uuid -notmatch '^[0-9a-fA-F-]{36}$') {
        throw 'unexpected API response; check Calls v2 before retrying'
    }
    Write-Output ('Queued VoiceCast call ' + [string]$result.data.call_uuid)
    exit 0
} catch {
    # Do not print response bodies, configuration values or transport details.
    Fail 'notification failed; check the PRTG and VoiceCast logs before retrying'
}
