<?php

define('sugarEntry', true);
require __DIR__ . '/files/custom/modules/VoiceCast/VoiceCastLogicHook.php';

function check($condition, $message)
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$hook = new VoiceCastLogicHook();
$bean = new stdClass();
$bean->module_dir = 'Cases';
$bean->priority = 'High';
$bean->name = 'Database “offline”';
$bean->case_number = '42';
$bean->status = 'New';
$bean->voicecast_phone_c = '+31612345678';
$bean->fetched_row = array('priority' => 'Low');
$rule = array(
    'when_field' => 'priority',
    'when_values' => array('High'),
    'only_on_change' => true,
    'phone_field' => 'voicecast_phone_c',
    'message' => 'Case {case_number}: {name}. {status}. {unknown}.',
);

check($hook->shouldTrigger($bean, $rule) === true, 'changed matching value must trigger');
check($hook->ruleForBean($bean, array('rules' => array('Cases' => $rule))) === $rule, 'module rule lookup failed');
check($hook->render($rule['message'], $bean) === 'Case 42: Database “offline”. New. .', 'message rendering failed');
$bean->fetched_row['priority'] = 'High';
check($hook->shouldTrigger($bean, $rule) === false, 'unchanged value must not trigger');
$bean->priority = 'Medium';
check($hook->shouldTrigger($bean, $rule) === false, 'unlisted value must not trigger');

echo "VoiceCast CRM logic-hook tests passed.\n";

