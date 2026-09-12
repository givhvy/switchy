const {test}=require('node:test');
const assert=require('node:assert/strict');
const {switchWithAudio}=require('../src/switch-audio');
test('every switch restores audio after the input command',async()=>{
 const calls=[]; const monitor={set:async(s,i)=>calls.push(i),restoreAudio:async()=>calls.push('audio')};
 for(const input of [16,15]) assert.deepEqual(await switchWithAudio(monitor,{},input,async()=>{}),{audioRestored:true});
 assert.deepEqual(calls,[16,'audio',15,'audio']);
});
test('retries audio after temporary disconnection',async()=>{
 let attempts=0;const delays=[];
 const result=await switchWithAudio({set:async()=>{},restoreAudio:async()=>{if(++attempts<3)throw Error('offline');}}, {},15,async ms=>delays.push(ms));
 assert.equal(result.audioRestored,true);assert.deepEqual(delays,[1500,2000,3000]);
});
test('audio failure does not misreport a successful input switch as failed',async()=>{
 const result=await switchWithAudio({set:async()=>{},restoreAudio:async()=>{throw Error('offline');}}, {},15,async()=>{});
 assert.equal(result.audioRestored,false);
});
test('failed input command never changes volume',async()=>{
 let touched=false;
 await assert.rejects(switchWithAudio({set:async()=>{throw Error('input failed');},restoreAudio:async()=>{touched=true;}},{},16,async()=>{}));
 assert.equal(touched,false);
});
