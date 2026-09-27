'use strict';
const testAuth = async (z, bundle) => (await z.request({url:bundle.authData.baseUrl.replace(/\/$/,'')+'/api/me',headers:{Authorization:'Bearer '+bundle.authData.apiKey}})).json;
const placeCall = async (z, bundle) => {
  const {callee,callflow,message}=bundle.inputData;
  if (!/^\+[1-9][0-9]{6,14}$/.test(callee)||!/^[0-9a-f-]{36}$/i.test(callflow)||!message.trim()) throw new z.errors.HaltedError('A valid E.164 number, callflow and message are required.');
  const response=await z.request({method:'POST',url:bundle.authData.baseUrl.replace(/\/$/,'')+'/api/call/v2',headers:{Authorization:'Bearer '+bundle.authData.apiKey,'Content-Type':'application/json'},body:{callee,callflow,calldate:new Date().toISOString(),parameters:{message,alert_text:message,source:'zapier'}},redirect:'manual'});
  if(response.status!==201||!response.json?.success) throw new z.errors.Error('VoiceCast did not confirm the call; check Calls v2 before retrying.','VoiceCastError',response.status);
  return response.json.data;
};
module.exports={version:require('./package.json').version,platformVersion:require('zapier-platform-core').version,authentication:{type:'custom',fields:[{key:'baseUrl',label:'Tenant URL',required:true,type:'string'},{key:'apiKey',label:'API key',required:true,type:'password'}],test:testAuth,connectionLabel:'{{bundle.authData.baseUrl}}'},creates:{place_call:{key:'place_call',noun:'Call',display:{label:'Place VoiceCast Call',description:'Queues a spoken telephone call.'},operation:{inputFields:[{key:'callee',required:true},{key:'callflow',required:true},{key:'message',required:true}],perform:placeCall,sample:{call_uuid:'550e8400-e29b-41d4-a716-446655440000'}}}}};
