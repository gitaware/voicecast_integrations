<?php

$hook_array['after_save'][] = array(
    90,
    'Queue a VoiceCast notification',
    'custom/modules/VoiceCast/VoiceCastLogicHook.php',
    'VoiceCastLogicHook',
    'afterSave',
);

