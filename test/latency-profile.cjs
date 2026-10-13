'use strict';
const fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const {createNativeWorker}=require('../src/native-worker');
(async()=>{
 const directory=process.argv[2] || path.join(__dirname,'..','native');
 const worker=createNativeWorker(directory),samples=[];
 try {
  for(let i=0;i<6;i++) {
   const start=performance.now(),state=await worker.request({action:'state'});
   if(!state.connected)throw Error(state.error || 'Secure client not confirmed.');
   samples.push({kind:i?'warm-native-guard':'cold-native-guard',milliseconds:performance.now()-start,nativeMs:state.nativeMs,connected:state.connected,corePid:state.processId,directory});
  }
  const output=path.join(process.env.LOCALAPPDATA,'SwitchyDeskflowSetup','latency-fast-guard.json');
  fs.writeFileSync(output,JSON.stringify(samples,null,2));console.log(JSON.stringify(samples,null,2));
 }finally{worker.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
