'use strict';
const assert=require('node:assert/strict'); const {test}=require('node:test');
test('registers a credential-backed VoiceCast node',()=>{let registered; const RED={nodes:{createNode(node){node.on=(name,fn)=>{node.input=fn};node.credentials={apiKey:'secret'}},registerType(name,ctor,options){registered={name,ctor,options}}}};require('./voicecast.js')(RED);assert.equal(registered.name,'voicecast-call');assert.equal(registered.options.credentials.apiKey.type,'password');});
