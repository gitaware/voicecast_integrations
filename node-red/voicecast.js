'use strict';
module.exports = function (RED) {
  function VoiceCastNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    node.on('input', async (msg, send, done) => {
      try {
        const url = new URL(config.url);
        const callee = String(msg.callee || config.callee || '').trim();
        const callflow = String(msg.callflow || config.callflow || '').trim();
        const message = String(msg.message || msg.payload || '').trim();
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('invalid tenant URL');
        if (!/^\+[1-9][0-9]{6,14}$/.test(callee)) throw new Error('invalid E.164 number');
        if (!/^[0-9a-f-]{36}$/i.test(callflow) || !message) throw new Error('callflow and message are required');
        const response = await fetch(url.toString().replace(/\/$/, '') + '/api/call/v2', {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
          headers: { authorization: 'Bearer ' + node.credentials.apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({ callee, callflow, calldate: new Date().toISOString(), parameters: { message, alert_text: message, source: 'node_red' } })
        });
        const result = await response.json().catch(() => null);
        if (response.status !== 201 || result?.success !== true) throw new Error('VoiceCast did not confirm the call');
        msg.voicecast = result.data;
        send(msg); done();
      } catch (error) { done(new Error('VoiceCast call failed; check Calls v2 before retrying')); }
    });
  }
  RED.nodes.registerType('voicecast-call', VoiceCastNode, { credentials: { apiKey: { type: 'password' } } });
};
