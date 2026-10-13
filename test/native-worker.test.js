'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {createNativeWorker}=require('../src/native-worker');
function fakeProcess() {
 const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
 child.kill=()=>{};child.requests=[];
 child.stdin.on('data',buffer=>child.requests.push(JSON.parse(String(buffer))));
 child.reply=value=>child.stdout.write(JSON.stringify({id:child.requests.at(-1).id,ok:true,value,nativeMs:2})+'\n');return child;
}
test('native worker uses one hidden process, prioritizes input over queued audio, and cancels stale work',async()=>{
 const child=fakeProcess();let launches=0;const worker=createNativeWorker('native',{launch:(_file,_args,options)=>{assert.equal(options.windowsHide,true);launches++;return child;}});
 try {
  const first=worker.request({action:'state'});let current=true;
  const audio=worker.request({action:'audio-step'},{priority:0,isCurrent:()=>current});
  const focus=worker.request({action:'focus'},{priority:2});current=false;
  child.reply({connected:true});await first;assert.equal(child.requests.at(-1).action,'focus');
  child.reply({sent:true});await focus;assert.deepEqual(await audio,{superseded:true});assert.equal(launches,1);assert.equal(child.requests.length,2);
 }finally{worker.close();}
});
test('native worker launch failure, timeout and malformed replies reject instead of hanging or replaying writes',async()=>{
 const bad=createNativeWorker('native',{launch:()=>{throw Error('launch failed');}});
 await assert.rejects(bad.request({action:'state'}),/launch failed/);bad.close();
 const child=fakeProcess(),worker=createNativeWorker('native',{launch:()=>child,timeout:15});
 await assert.rejects(worker.request({action:'set'}),/respond in time/);assert.equal(child.requests.length,1);worker.close();
 const malformed=fakeProcess(),other=createNativeWorker('native',{launch:()=>malformed});
 const pending=other.request({action:'state'});malformed.stdout.write('not json\n');await assert.rejects(pending,/Invalid native response/);other.close();
});
