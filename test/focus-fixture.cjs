const {app}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'switchy-focus-fixture-'));
app.setPath('userData',directory);
fs.writeFileSync(path.join(directory,'settings.json'),JSON.stringify({monitorId:'test:0',windowsInput:15,macInput:16,followDeskflowFocus:true}));
global.focusCalls=[];global.testFocus='windows';global.testConnected=true;
global.holdAudio=false;global.audioPending=false;global.focusDurations=[];let observedAt;
global.focusLog=path.join(directory,'deskflow.log');fs.writeFileSync(global.focusLog,'');
global.truncateFocusLog=()=>fs.writeFileSync(global.focusLog,'');
global.appendFocus=target=>{global.testFocus=target;observedAt=Date.now();fs.appendFileSync(global.focusLog,'['+new Date().toISOString()+'] INFO: '+(target==='windows'?'entering':'leaving')+' computer\n');};
const modulePath=require.resolve('../src/monitor');
require.cache[modulePath]={id:modulePath,filename:modulePath,loaded:true,exports:{createMonitor:()=>({
 hasFastFocus:true,
 list:async()=>[{id:'test:0',name:'Test monitor',readable:true,current:18}],
 set:async(_settings,input,options={})=>{
   if(options.focusTarget && (!global.testConnected || options.focusTarget!==global.testFocus))return {sent:false,reason:'SecureClientFocusChanged'};
   global.focusCalls.push(input);if(observedAt)global.focusDurations.push(Date.now()-observedAt);return {sent:true,guarded:true,clientPid:123,guardAt:new Date().toISOString(),guardMs:1};
 },restoreAudio:async()=>{if(global.holdAudio){global.audioPending=true;await new Promise(resolve=>{global.releaseAudio=resolve;});global.audioPending=false;}},
 deskflowState:async()=>({connected:global.testConnected,sessionId:3,processId:123,logFile:global.focusLog,events:'INFO: connected to secure socket\nINFO: '+(global.testFocus==='windows'?'entering':'leaving')+' computer'})
})}};
require('../src/main');
