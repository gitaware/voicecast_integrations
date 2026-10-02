# VoiceCast integration for MikroTik RouterOS 7.
# Replace the four values in the configuration section before importing.
# The API key remains visible in the installed script source; restrict router access.

:local scriptName "voicecast-call"

:if ([:len [/system script find where name=$scriptName]] > 0) do={
    :error "VoiceCast: a script named voicecast-call already exists"
}

/system script add name=$scriptName comment="Queue a VoiceCast call through the Calls v2 API" \
    dont-require-permissions=no policy=read,test source={
    # --- VoiceCast configuration ---
    :local voiceCastUrl "https://voicecast.example.com"
    :local voiceCastApiKey "REPLACE_WITH_VOICECAST_API_KEY"
    :local voiceCastCallflow "550e8400-e29b-41d4-a716-446655440000"
    :local voiceCastDefaultTo "+31612345678"
    # --- End configuration ---

    :if ([:pick $voiceCastUrl 0 8] != "https://") do={
        :error "VoiceCast: the tenant URL must use HTTPS"
    }
    :if ([:pick $voiceCastUrl ([:len $voiceCastUrl] - 1) [:len $voiceCastUrl]] = "/") do={
        :set voiceCastUrl [:pick $voiceCastUrl 0 ([:len $voiceCastUrl] - 1)]
    }
    :if (($voiceCastApiKey = "") || ($voiceCastApiKey = "REPLACE_WITH_VOICECAST_API_KEY")) do={
        :error "VoiceCast: configure the API key"
    }
    :if ([:len $voiceCastCallflow] != 36) do={
        :error "VoiceCast: configure a valid callflow UUID"
    }
    :if (([:typeof $message] != "str") || ([:len $message] = 0)) do={
        :error "VoiceCast: message is required"
    }

    :local destination $voiceCastDefaultTo
    :if ([:typeof $to] = "str") do={
        :if ([:len $to] > 0) do={
            :set destination $to
        }
    }
    :if (([:len $destination] < 8) || ([:len $destination] > 16) || ([:pick $destination 0 1] != "+")) do={
        :error "VoiceCast: destination must be an international E.164 number"
    }

    :local eventName ""
    :if ([:typeof $event] = "str") do={
        :set eventName $event
    }

    :local parameters ({
        "alert_text"=$message;
        "event"=$eventName;
        "message"=$message;
        "router_identity"=[/system identity get name];
        "routeros_version"=[/system resource get version];
        "source"="mikrotik"
    })
    :local payload ({
        "callee"=$destination;
        "callflow"=$voiceCastCallflow;
        "parameters"=$parameters
    })
    :local requestBody [:serialize to=json value=$payload options=json.no-string-conversion]
    :local endpoint ($voiceCastUrl . "/api/call/v2")
    :local headers ("Authorization: Bearer " . $voiceCastApiKey . ",Content-Type: application/json,Accept: application/json")
    :local fetchResult

    :onerror fetchError in={
        :set fetchResult [/tool fetch url=$endpoint http-method=post http-header-field=$headers \
            http-data=$requestBody check-certificate=yes-without-crl http-max-redirect-count=0 \
            duration=20s idle-timeout=10s output=user as-value]
    } do={
        :log error "VoiceCast: request failed; check connectivity, credentials and Calls v2 before retrying"
        :error "VoiceCast request failed"
    }

    :if ($fetchResult->"status" != "finished") do={
        :log error "VoiceCast: request did not finish"
        :error "VoiceCast request did not finish"
    }

    :local response
    :onerror parseError in={
        :set response [:deserialize from=json value=($fetchResult->"data") options=json.no-string-conversion]
    } do={
        :log error "VoiceCast: API returned an invalid response"
        :error "VoiceCast returned an invalid response"
    }

    :if ($response->"success" != true) do={
        :log error "VoiceCast: API did not accept the call"
        :error "VoiceCast did not accept the call"
    }

    :local callUuid ($response->"data"->"call_uuid")
    :if (([:typeof $callUuid] != "str") || ([:len $callUuid] != 36)) do={
        :log error "VoiceCast: API response did not contain a call UUID"
        :error "VoiceCast response did not contain a call UUID"
    }

    :log info ("VoiceCast: queued call " . $callUuid)
    :return $callUuid
}

:put "Installed system script: voicecast-call"
:put "Delete this import file from Files because it contains the VoiceCast API key."
