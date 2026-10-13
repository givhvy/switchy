'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {parseFocusCommand, routeFocusCommand} = require('../src/focus-command');
const {createFocusQueue} = require('../src/focus-queue');
const {acceptFocusRequest, parseDeskflowState} = require('../src/focus-state');

test('focus CLI accepts only one fixed target and forwards without showing UI', () => {
  const calls = [];
  for (const target of ['windows', 'mac']) {
    assert.equal(routeFocusCommand(['app', '--deskflow-focus='+target], value => calls.push(value), () => calls.push('show')), true);
  }
  assert.deepEqual(calls, ['windows', 'mac']);
  for (const flags of [['--deskflow-focus=toggle'], ['--deskflow-focus='], ['--deskflow-focus'], ['--deskflow-focus=mac', '--deskflow-focus=windows']]) {
    assert.equal(parseFocusCommand(flags).invalid, true);
    routeFocusCommand(flags, () => assert.fail('invalid dispatch'), () => assert.fail('invalid UI'));
  }
  routeFocusCommand(['--background'], () => assert.fail('background dispatch'), () => assert.fail('background UI'));
  routeFocusCommand([], () => assert.fail('normal dispatch'), () => calls.push('show'));
  assert.equal(calls.at(-1), 'show');
});

test('focus guard resets on reconnect, shutdown and lost server; never treats keystrokes as focus', () => {
  const connected = '[x] INFO: started client\n[x] INFO: connected to secure socket\n';
  assert.deepEqual(parseDeskflowState(connected+'[x] INFO: entering computer'), {connected:true, target:'windows'});
  assert.deepEqual(parseDeskflowState(connected+'[x] INFO: entering computer\n[x] INFO: leaving computer'), {connected:true, target:'mac'});
  for (const ending of ['INFO: server is dead', 'INFO: stopped client', 'WARNING: failed to connect to server: timeout']) {
    assert.deepEqual(parseDeskflowState(connected+'INFO: entering computer\n'+ending), {connected:false, target:null});
  }
  assert.deepEqual(parseDeskflowState(connected+'INFO: entering computer\nINFO: connected to secure socket'), {connected:true, target:null});
  assert.equal(parseDeskflowState(connected+'DEBUG: key down entering computer').target, null);
});

test('spool rejects stale, future, wrong-session and malformed requests', () => {
  const request={id:'abc',target:'windows',createdAt:10000,sessionId:3};
  assert.equal(acceptFocusRequest(request,10001,9000,3),true);
  for(const bad of [{...request,target:'toggle'},{...request,createdAt:8000},{...request,createdAt:99999},{...request,sessionId:0},{...request,id:''},null]) {
    assert.equal(acceptFocusRequest(bad,10001,9000,3),false);
  }
});

test('queue coalesces a rapid enter/leave and verifies the latest direction', async () => {
  let release;
  const wait=()=>new Promise(resolve=>{release=resolve;});
  const seen=[];
  const q=createFocusQueue({wait,verify:async target=>{seen.push('guard:'+target);return true;},apply:async target=>seen.push(target)});
  const done=q.request('windows');q.request('mac');release();await done;
  assert.deepEqual(seen,['guard:mac','mac']);
});

test('queue serializes writes, retains focus changes while busy, and cancels superseded audio', async () => {
  let release,active=0,maxActive=0;const seen=[];
  const q=createFocusQueue({wait:async()=>{},verify:async()=>true,apply:async(target,isCurrent)=>{
    maxActive=Math.max(maxActive,++active);seen.push(target);
    if(target==='windows'){await new Promise(resolve=>{release=resolve;});assert.equal(isCurrent(),false);}
    active--;
  }});
  const done=q.request('windows');
  while(!release)await new Promise(resolve=>setImmediate(resolve));
  q.request('windows');q.request('mac');release();await done;
  assert.deepEqual(seen,['windows','mac']);assert.equal(maxActive,1);
});

test('queue rejects disconnected/stale guards and does not retry failed DDC indefinitely', async () => {
  const errors=[];let writes=0;
  const q=createFocusQueue({wait:async()=>{},verify:async()=>false,apply:async()=>writes++});
  await q.request('mac');assert.equal(writes,0);
  const failed=createFocusQueue({wait:async()=>{},verify:async()=>true,apply:async()=>{writes++;throw Error('DDC unavailable');},onError:e=>errors.push(e.message)});
  await failed.request('windows');assert.equal(writes,1);assert.deepEqual(errors,['DDC unavailable']);
  failed.stop();await failed.request('mac');assert.equal(writes,1);
});

test('a newer request arriving during guard validation cancels the older write', async () => {
  let release;const seen=[];
  const q=createFocusQueue({wait:async()=>{},verify:async target=>{if(target==='windows')await new Promise(resolve=>{release=resolve;});return true;},apply:async target=>seen.push(target)});
  const done=q.request('windows');while(!release)await new Promise(resolve=>setImmediate(resolve));
  q.request('mac');release();await done;assert.deepEqual(seen,['mac']);
});

test('disconnect invalidation cancels a pending verified write without stopping future reconnects',async()=>{
  let release;const seen=[];
  const q=createFocusQueue({wait:async()=>{},verify:async()=>new Promise(resolve=>{release=resolve;}),apply:async t=>seen.push(t)});
  const done=q.request('windows');while(!release)await new Promise(resolve=>setImmediate(resolve));
  q.cancel();release(true);await done;assert.deepEqual(seen,[]);
  release=null;const reconnect=q.request('mac');while(!release)await new Promise(resolve=>setImmediate(resolve));
  release(true);await reconnect;assert.deepEqual(seen,['mac']);
});
