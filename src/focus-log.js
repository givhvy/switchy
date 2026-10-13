'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {normalizeServerEvent}=require('./focus-state');
function watchDeskflowLog(file,{connected=false,revalidateFocus,dispatch,invalidate,onError=()=>{},onEvent=()=>{},now=Date.now,interval=500}) {
  let offset=0,identity=null,partial='',stopped=false,ready=connected,revision=0;
  const seenFocus=new Map();
  const reset=()=>{revision++;ready=false;partial='';invalidate();};
  const fresh=time=>Number.isFinite(time) && now()-time<=10000 && now()-time>=-1000;
  function focus(target,at,time) {
    if(!ready && !revalidateFocus)return;
    for(const [key,stamp] of seenFocus)if(now()-stamp>10000)seenFocus.delete(key);
    const key=time+':'+target;
    if(seenFocus.has(key) || seenFocus.size>=1024)return;
    seenFocus.set(key,time);
    const version=++revision;
    const emit=()=>{onEvent({target,event:'focus',at});dispatch(target);};
    if(ready){emit();return;}
    Promise.resolve().then(()=>revalidateFocus(target)).then(allowed=>{
      if(stopped || version!==revision || !fresh(time))return;
      if(allowed!==true){onEvent({target,event:'revalidation-refused',at});return;}
      ready=true;onEvent({target,event:'revalidated',at});emit();
    }).catch(error=>{if(!stopped && version===revision)onError(error);});
  }
  function read(initial=false) {
    if(stopped)return;
    let fd;
    try {
      fd=fs.openSync(file,'r');const stat=fs.fstatSync(fd),key=stat.dev+':'+stat.ino;
      if(initial || identity!==key || stat.size<offset) {
        if(!initial)reset();identity=key;offset=stat.size;partial='';return;
      }
      const length=stat.size-offset;
      if(!length)return;
      if(length>65536){reset();offset=stat.size;return;}
      const buffer=Buffer.alloc(length),count=fs.readSync(fd,buffer,0,length,offset);offset+=count;
      const lines=(partial+buffer.subarray(0,count).toString('utf8')).split(/\r?\n/);partial=lines.pop();
      if(partial.length>2048){reset();partial='';}
      for(const rawLine of lines) {
        const line=normalizeServerEvent(rawLine);
        const match=/^\[([^\]]+)\] (INFO: (entering computer|leaving computer|connected to secure socket|started client|stopped client|server is dead)|WARNING: failed to connect to server.*)$/.exec(line);
        if(!match)continue;
        const time=Date.parse(match[1]);
        if(!fresh(time)){reset();continue;}
        const event=match[2];
        if(event==='INFO: connected to secure socket'){reset();ready=true;onEvent({event:'connected',at:match[1]});}
        else if(event==='INFO: entering computer' || event==='INFO: leaving computer') {
          const target=event==='INFO: entering computer'?'windows':'mac';
          focus(target,match[1],time);
        } else {reset();onEvent({event:'disconnected',at:match[1]});}
      }
    } catch(error) {reset();if(error.code!=='ENOENT')onError(error);}
    finally {if(fd!==undefined)fs.closeSync(fd);}
  }
  read(true);
  const watcher=fs.watch(path.dirname(file),(_event,name)=>{if(!name || String(name)===path.basename(file))read();});
  watcher.on('error',onError);
  const timer=setInterval(read,interval);timer.unref();
  return ()=>{stopped=true;watcher.close();clearInterval(timer);invalidate();};
}
module.exports={watchDeskflowLog};
