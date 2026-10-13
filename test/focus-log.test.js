'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {watchDeskflowLog}=require('../src/focus-log');
const pause=()=>new Promise(resolve=>setTimeout(resolve,80));
test('log observer starts at EOF, accepts fresh INFO only, handles partial lines and disconnects',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'switchy-log-')),file=path.join(dir,'deskflow.log');
  const stamp=new Date().toISOString(),line=event=>'['+stamp+'] '+event+'\n';
  fs.writeFileSync(file,line('INFO: entering computer'));
  const targets=[];let invalidations=0;
  const stop=watchDeskflowLog(file,{connected:true,interval:15,dispatch:t=>targets.push(t),invalidate:()=>invalidations++});
  try {
    await pause();assert.deepEqual(targets,[]);
    fs.appendFileSync(file,line('DEBUG: entering computer')+'['+stamp+'] INFO: entering');
    await pause();assert.deepEqual(targets,[]);
    fs.appendFileSync(file,' computer\n');await pause();assert.deepEqual(targets,['windows']);
    fs.appendFileSync(file,line('INFO: server is dead')+line('INFO: leaving computer'));
    await pause();assert.deepEqual(targets,['windows']);assert.equal(invalidations,1);
    fs.appendFileSync(file,line('INFO: connected to secure socket')+line('INFO: leaving computer'));
    await pause();assert.deepEqual(targets,['windows','mac']);
    fs.appendFileSync(file,'[2001-01-01T00:00:00] INFO: entering computer\n'+line('INFO: entering computer'));
    await pause();assert.deepEqual(targets,['windows','mac']);
  }finally{stop();fs.rmSync(file);fs.rmdirSync(dir);}
});
test('log observer invalidates on truncation and rotation without replaying replacement history',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'switchy-log-')),file=path.join(dir,'deskflow.log');
  const line=event=>'['+new Date().toISOString()+'] INFO: '+event+'\n';
  fs.writeFileSync(file,line('entering computer'));const targets=[];let invalidations=0;
  const stop=watchDeskflowLog(file,{connected:true,interval:15,dispatch:t=>targets.push(t),invalidate:()=>invalidations++});
  try {
    fs.writeFileSync(file,'');await pause();assert.ok(invalidations>0);
    fs.appendFileSync(file,line('leaving computer'));await pause();assert.deepEqual(targets,[]);
    fs.appendFileSync(file,line('connected to secure socket')+line('entering computer'));
    await pause();assert.deepEqual(targets,['windows']);
    fs.renameSync(file,file+'.old');fs.writeFileSync(file,line('leaving computer'));await pause();
    assert.deepEqual(targets,['windows']);
    fs.appendFileSync(file,line('connected to secure socket')+line('leaving computer'));await pause();
    assert.deepEqual(targets,['windows','mac']);
  }finally{stop();fs.rmSync(file);fs.rmSync(file+'.old');fs.rmdirSync(dir);}
});
