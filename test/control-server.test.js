'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const {createControlServer}=require('../src/control-server');
const {normalizeServerEvent,parseDeskflowState}=require('../src/focus-state');
function send(endpoint,request){return new Promise((resolve,reject)=>{const socket=net.createConnection(endpoint.pipe);let data='';socket.setEncoding('utf8');socket.on('error',reject);socket.on('connect',()=>socket.write(JSON.stringify(request)+'\n'));socket.on('data',chunk=>data+=chunk);socket.on('end',()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});});}
test('local pipe authenticates before dispatch and keeps display separate from focus policy',{skip:process.platform!=='win32'},async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'switchy-control-'));const calls=[];
 const server=createControlServer({directory,dispatch:async r=>{calls.push(r.action);return {sent:true};}});
 try{
  await server.start();const endpoint=JSON.parse(await fs.readFile(path.join(directory,'control.json')));
  assert.equal((await send(endpoint,{action:'display',target:'mac',token:'0'.repeat(64)})).ok,false);assert.deepEqual(calls,[]);
  assert.equal((await send(endpoint,{action:'display',target:'toggle',token:endpoint.token})).ok,false);assert.deepEqual(calls,[]);
  assert.equal((await send(endpoint,{action:'display',target:'mac',requireFocus:true,token:endpoint.token})).ok,true);
  assert.equal((await send(endpoint,{action:'policy',follow:false,token:endpoint.token})).ok,true);assert.deepEqual(calls,['display','policy']);
 }finally{server.close();await fs.rm(directory,{recursive:true,force:true});}
});
test('server focus parsing recognizes only the paired device names',()=>{
 const lines=['[2026-10-13T10:00:00.000] INFO: accepted secure socket','[2026-10-13T10:00:01.000] INFO: switch from "DESKTOP-S9B3N7M" to "NotchDash-Mac" at 100,200'];
 assert.deepEqual(parseDeskflowState(lines.map(normalizeServerEvent).join('\n')),{connected:true,target:'mac'});
 assert.equal(normalizeServerEvent(lines[1].replace('NotchDash-Mac','Unknown')),lines[1].replace('NotchDash-Mac','Unknown'));
});
