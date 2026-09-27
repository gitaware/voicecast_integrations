<?php

if (!defined('sugarEntry') || !sugarEntry) {
    die('Not A Valid Entry Point');
}

class VoiceCastLogicHook
{
    private static $handled = array();

    public function afterSave($bean, $event, $arguments)
    {
        $key = (isset($bean->module_dir) ? $bean->module_dir : get_class($bean)) . ':' . (isset($bean->id) ? $bean->id : '');
        if (isset(self::$handled[$key])) {
            return;
        }
        self::$handled[$key] = true;

        $configFile = dirname(__DIR__, 2) . '/voicecast_config.php';
        if (!is_file($configFile)) {
            return;
        }
        $config = require $configFile;
        if (!is_array($config) || empty($config['enabled'])) {
            return;
        }

        try {
            $rule = $this->ruleForBean($bean, $config);
            if ($rule === null || !$this->shouldTrigger($bean, $rule)) {
                return;
            }
            $phoneField = isset($rule['phone_field']) ? $rule['phone_field'] : '';
            $callee = $this->beanValue($bean, $phoneField);
            $message = $this->render(isset($rule['message']) ? $rule['message'] : '', $bean);
            $callflow = isset($rule['callflow']) && $rule['callflow'] !== '' ? $rule['callflow'] : (isset($config['callflow']) ? $config['callflow'] : '');
            $this->send($config, $callee, $callflow, $message, $this->platformSource());
        } catch (Exception $exception) {
            if (isset($GLOBALS['log'])) {
                $GLOBALS['log']->error('VoiceCast notification failed: ' . $exception->getMessage());
            }
        }
    }

    public function ruleForBean($bean, array $config)
    {
        $module = isset($bean->module_dir) ? $bean->module_dir : '';
        return isset($config['rules'][$module]) && is_array($config['rules'][$module])
            ? $config['rules'][$module] : null;
    }

    public function shouldTrigger($bean, array $rule)
    {
        $field = isset($rule['when_field']) ? $rule['when_field'] : '';
        $allowed = isset($rule['when_values']) && is_array($rule['when_values']) ? $rule['when_values'] : array();
        $current = $this->beanValue($bean, $field);
        if ($field === '' || !in_array($current, $allowed, true)) {
            return false;
        }
        if (!empty($rule['only_on_change']) && isset($bean->fetched_row) && is_array($bean->fetched_row)) {
            $previous = isset($bean->fetched_row[$field]) ? trim((string) $bean->fetched_row[$field]) : null;
            if ($previous !== null && $previous === $current) {
                return false;
            }
        }
        return true;
    }

    public function render($template, $bean)
    {
        $module = isset($bean->module_dir) ? $bean->module_dir : get_class($bean);
        return trim(preg_replace_callback('/\{([A-Za-z][A-Za-z0-9_]*)\}/', function ($match) use ($bean, $module) {
            if ($match[1] === 'module') {
                return $module;
            }
            return $this->beanValue($bean, $match[1]);
        }, (string) $template));
    }

    protected function beanValue($bean, $field)
    {
        if ($field === '' || !preg_match('/^[A-Za-z][A-Za-z0-9_]*$/', $field)) {
            return '';
        }
        return isset($bean->$field) && !is_array($bean->$field) && !is_object($bean->$field)
            ? trim((string) $bean->$field) : '';
    }

    protected function platformSource()
    {
        return isset($GLOBALS['sugar_config']['suitecrm_version']) ? 'suitecrm' : 'sugarcrm';
    }

    protected function send(array $config, $callee, $callflow, $message, $source)
    {
        $url = isset($config['url']) ? rtrim((string) $config['url'], '/') : '';
        $apiKey = isset($config['api_key']) ? (string) $config['api_key'] : '';
        if (!preg_match('#^https://[^/?#]+(?:/[^?#]*)?$#i', $url) || strpos($url, '@') !== false || preg_match('#/api(?:/|$)#', parse_url($url, PHP_URL_PATH))) {
            throw new RuntimeException('invalid VoiceCast URL');
        }
        if ($apiKey === '' || preg_match('/[\r\n]/', $apiKey)) {
            throw new RuntimeException('invalid VoiceCast API key');
        }
        if (!preg_match('/^\+[1-9][0-9]{6,14}$/', $callee)) {
            throw new RuntimeException('invalid destination number');
        }
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $callflow)) {
            throw new RuntimeException('invalid callflow UUID');
        }
        if ($message === '') {
            throw new RuntimeException('empty notification message');
        }
        if (!function_exists('curl_init')) {
            throw new RuntimeException('PHP cURL extension is required');
        }

        $payload = json_encode(array(
            'callee' => $callee,
            'callflow' => $callflow,
            'calldate' => gmdate('Y-m-d\TH:i:s\Z'),
            'parameters' => array(
                'message' => $message,
                'alert_text' => $message,
                'source' => strtolower((string) $source),
            ),
        ));
        if ($payload === false) {
            throw new RuntimeException('could not encode notification');
        }

        $handle = curl_init($url . '/api/call/v2');
        curl_setopt_array($handle, array(
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => array('Authorization: Bearer ' . $apiKey, 'Content-Type: application/json', 'Accept: application/json'),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 20,
        ));
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        $transportFailed = $body === false;
        curl_close($handle);
        $decoded = $transportFailed ? null : json_decode($body, true);
        if ($transportFailed || $status !== 201 || !is_array($decoded) || empty($decoded['success']) ||
            empty($decoded['data']['call_uuid']) || !preg_match('/^[0-9a-f-]{36}$/i', $decoded['data']['call_uuid'])) {
            throw new RuntimeException('call was not confirmed; check VoiceCast Calls v2 before retrying');
        }
    }
}
