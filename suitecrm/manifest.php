<?php

$manifest = array(
    'acceptable_sugar_versions' => array('regex_matches' => array('^6\\.5\\.')),
    'acceptable_sugar_flavors' => array('CE'),
    'author' => 'VoiceCast',
    'description' => 'Queue VoiceCast calls from SuiteCRM record changes.',
    'is_uninstallable' => true,
    'name' => 'VoiceCast for SuiteCRM',
    'published_date' => '2026-09-25',
    'type' => 'module',
    'version' => '1.0.0',
);

$installdefs = array(
    'id' => 'voicecast_suitecrm',
    'copy' => array(
        array('from' => '<basepath>/custom/modules/VoiceCast', 'to' => 'custom/modules/VoiceCast'),
        array('from' => '<basepath>/custom/voicecast_config.php.example', 'to' => 'custom/voicecast_config.php.example'),
        array('from' => '<basepath>/custom/Extension/modules/Cases/Ext/LogicHooks/voicecast.php', 'to' => 'custom/Extension/modules/Cases/Ext/LogicHooks/voicecast.php'),
        array('from' => '<basepath>/custom/Extension/modules/Leads/Ext/LogicHooks/voicecast.php', 'to' => 'custom/Extension/modules/Leads/Ext/LogicHooks/voicecast.php'),
    ),
);
