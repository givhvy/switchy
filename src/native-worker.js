'use strict';
const path=require('node:path');
const {spawn}=require('node:child_process');
function createNativeWorker(directory,{launch=spawn,timeout=25000}={}) {
  let child=null,buffer='',active=null,nextId=1,closed=false;const queue=[];
  function fail(error) {
    const old=child;child=null;buffer='';old?.kill();
    if(active){clearTimeout(active.timer);active.reject(error);active=null;}
    for(const item of queue.splice(0))item.reject(error);
  }
  function start() {
    if(child)return;
    const shell=path.join(process.env.SystemRoot || 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
    const proc=launch(shell,['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(directory,'fast-host.ps1')],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    child=proc;let stderr='';
    proc.stdout.setEncoding('utf8');proc.stderr.setEncoding('utf8');
    proc.stderr.on('data',text=>{stderr=(stderr+text).slice(-4096);});
    proc.stdout.on('data',text=>{
      if(child!==proc)return;buffer+=text;
      if(buffer.length>131072){fail(Error('Native response too large.'));return;}
      let index;
      while((index=buffer.indexOf('\n'))>=0) {
        const line=buffer.slice(0,index);buffer=buffer.slice(index+1);
        let value;try {value=JSON.parse(line);}catch {fail(Error('Invalid native response.'));return;}
        if(!active || value.id!==active.id){fail(Error('Native response id mismatch.'));return;}
        const item=active;active=null;clearTimeout(item.timer);
        if(value.ok)item.resolve({...value.value,nativeMs:value.nativeMs});else item.reject(Error(value.error || 'Native operation failed.'));
        pump();
      }
    });
    proc.on('error',error=>{if(child===proc)fail(error);});
    proc.on('exit',()=>{if(child===proc)fail(Error(stderr.trim() || 'Native helper stopped.'));});
  }
  function pump() {
    if(active || closed)return;
    queue.sort((a,b)=>b.priority-a.priority || a.id-b.id);
    let item;
    while((item=queue.shift())) {
      if(!item.isCurrent()){item.resolve({superseded:true});continue;}
      try {
        start();active=item;
        item.timer=setTimeout(()=>fail(Error('Native helper did not respond in time.')),timeout);
        child.stdin.write(JSON.stringify({id:item.id,...item.value})+'\n',error=>{if(error && active===item)fail(error);});
      }catch(error){if(active!==item)item.reject(error);fail(error);}
      return;
    }
  }
  return {
    request(value,{priority=1,isCurrent=()=>true}={}) {
      if(closed)return Promise.reject(Error('Native helper is closed.'));
      return new Promise((resolve,reject)=>{queue.push({id:nextId++,value,priority,isCurrent,resolve,reject});pump();});
    },
    close(){closed=true;fail(Error('Native helper is closed.'));}
  };
}
module.exports={createNativeWorker};
