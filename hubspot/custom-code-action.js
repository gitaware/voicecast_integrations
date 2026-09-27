'use strict';
const axios = require('axios');
exports.main = async (event, callback) => {
  try {
    const url = new URL(process.env.VOICECAST_URL);
    const callee = String(event.inputFields.callee || '').trim();
    const callflow = String(event.inputFields.callflow || process.env.VOICECAST_CALLFLOW || '').trim();
    const message = String(event.inputFields.message || '').trim();
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    if (!/^\+[1-9][0-9]{6,14}$/.test(callee) || !/^[0-9a-f-]{36}$/i.test(callflow) || !message) throw new Error();
    const response = await axios.post(url.toString().replace(/\/$/,'') + '/api/call/v2', {callee,callflow,calldate:new Date().toISOString(),parameters:{message,alert_text:message,source:'hubspot'}}, {headers:{Authorization:'Bearer '+process.env.VOICECAST_API_KEY},timeout:20000,maxRedirects:0,validateStatus:()=>true});
    if (response.status !== 201 || response.data?.success !== true || !/^[0-9a-f-]{36}$/i.test(response.data?.data?.call_uuid || '')) throw new Error();
    callback({outputFields:{call_uuid:response.data.data.call_uuid}});
  } catch (_) { throw new Error('VoiceCast call failed; check Calls v2 before retrying'); }
};
