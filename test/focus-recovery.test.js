'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {watchDeskflowLog}=require('../src/focus-log');
const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
const line=(event,stamp=new Date().toISOString())=>'['+stamp+'] INFO: '+event+'\n';
function fixture(options={}) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'switchy-recovery-')),file=path.join(dir,'deskflow.log');
  fs.writeFileSync(file,line('connected to secure socket','2001-01-01T00:00:00Z'));
  const targets=[],checks=[];
  const guard={connected:true,ownedClient:true,tls:true,trusted:true,target:'windows'};
  const stop=watchDeskflowLog(file,{connected:true,interval:15,dispatch:t=>targets.push(t),invalidate:()=>{},
    revalidateFocus:async target=>{checks.push(target);return guard.connected&&guard.ownedClient&&guard.tls&&guard.trusted&&guard.target===target;},...options});
  return {file,targets,checks,guard,append:event=>fs.appendFileSync(file,line(event)),
    close(){stop();for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}};
}
test('late startup skips old TLS/history and recovers a missed initial connection on fresh focus',async()=>{
  const f=fixture({connected:false});
  try {await pause();assert.deepEqual(f.targets,[]);f.append('entering computer');await pause();assert.deepEqual(f.targets,['windows']);assert.deepEqual(f.checks,['windows']);}
  finally{f.close();}
});
for(const fault of ['truncate','replace','read-error'])test('fresh authenticated focus recovers after '+fault+' without a new TLS log line',async()=>{
  const f=fixture();
  try {
    if(fault==='truncate')fs.writeFileSync(f.file,'');
    else {fs.renameSync(f.file,f.file+'.old');if(fault==='replace')fs.writeFileSync(f.file,line('leaving computer'));}
    await pause();
    if(fault==='read-error'){fs.renameSync(f.file+'.old',f.file);await pause();}
    assert.deepEqual(f.targets,[]);
    f.append('entering computer');await pause();assert.deepEqual(f.targets,['windows']);assert.deepEqual(f.checks,['windows']);
    f.guard.target='mac';f.append('leaving computer');await pause();assert.deepEqual(f.targets,['windows','mac']);
  }finally{f.close();}
});
test('recovery refuses an untrusted, disconnected, unowned or changed-focus client',async()=>{
  const f=fixture({connected:false});
  try {
    for(const field of ['connected','ownedClient','tls','trusted']){
      f.guard[field]=false;f.append('entering computer');await pause();assert.deepEqual(f.targets,[]);f.guard[field]=true;
    }
    f.guard.target='mac';f.append('entering computer');await pause();assert.deepEqual(f.targets,[]);
    f.append('leaving computer');await pause();assert.deepEqual(f.targets,['mac']);
  }finally{f.close();}
});
test('disconnect or newer focus invalidates an in-flight recovery result',async()=>{
  const pending=[];const f=fixture({connected:false,revalidateFocus:()=>new Promise(resolve=>pending.push(resolve))});
  try {
    f.append('entering computer');await pause();assert.equal(pending.length,1);
    f.append('server is dead');await pause();pending.shift()(true);await pause();assert.deepEqual(f.targets,[]);
    f.append('entering computer');await pause();f.append('leaving computer');await pause();assert.equal(pending.length,2);
    pending.shift()(true);await pause();assert.deepEqual(f.targets,[]);
    pending.shift()(true);await pause();assert.deepEqual(f.targets,['mac']);
  }finally{f.close();}
});
test('recovery never replays an event that aged out while validation was pending',async()=>{
  let time=Date.now(),resolve;const f=fixture({connected:false,now:()=>time,revalidateFocus:()=>new Promise(done=>{resolve=done;})});
  try {f.append('entering computer');await pause();assert.equal(typeof resolve,'function');time+=11000;resolve(true);await pause();assert.deepEqual(f.targets,[]);}
  finally{f.close();}
});
test('duplicate focus is ignored and a rapid enter/leave batch keeps only the latest recovery',async()=>{
  const f=fixture({connected:false});
  try {
    f.guard.target='mac';const enter=line('entering computer'),leave=line('leaving computer');
    fs.appendFileSync(f.file,enter+leave+leave);await pause();assert.deepEqual(f.targets,['mac']);assert.deepEqual(f.checks,['windows','mac']);
    fs.appendFileSync(f.file,leave);await pause();assert.deepEqual(f.targets,['mac']);
  }finally{f.close();}
});
