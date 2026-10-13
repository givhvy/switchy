'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createAudioRestorer}=require('../src/audio-restore');
const {createFocusQueue}=require('../src/focus-queue');
test('latest input is written while old audio is pending, and old audio cannot publish a result',async()=>{
 let release,started;const audioStarted=new Promise(resolve=>{started=resolve;});const results=[],inputs=[];
 const audio=createAudioRestorer({monitor:{restoreAudio:async()=>{started();await new Promise(resolve=>{release=resolve;});}},wait:async()=>{},onResult:r=>results.push(r)});
 const old=audio.restore({},15);await audioStarted;
 const queue=createFocusQueue({wait:async()=>{},verify:async()=>true,apply:async target=>{audio.cancel();inputs.push(target);}});
 await queue.request('mac');assert.deepEqual(inputs,['mac']);assert.deepEqual(results,[]);
 release();assert.equal((await old).superseded,true);assert.deepEqual(results,[]);audio.cancel();queue.stop();
});
test('new restoration actively cancels the previous settling wait',async()=>{
 let waits=0;const audio=createAudioRestorer({monitor:{restoreAudio:async()=>{}},wait:(_ms,signal)=>new Promise(resolve=>{waits++;signal.addEventListener('abort',resolve,{once:true});})});
 const first=audio.restore({},15);const second=audio.restore({},16);
 assert.equal((await first).superseded,true);audio.cancel();assert.equal((await second).superseded,true);assert.equal(waits,2);
});
