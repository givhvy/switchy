'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {acceptFocusRequest}=require('./focus-state');
function watchFocusRequests(userData,sessionId,dispatch,onError) {
  const directory=path.join(userData,'deskflow-focus'),file=path.join(directory,'request.json');
  fs.mkdirSync(directory,{recursive:true});
  const startedAt=Date.now();let lastId=null;
  const read=()=>{
    try {
      const value=JSON.parse(fs.readFileSync(file,'utf8'));
      if(value.id===lastId || !acceptFocusRequest(value,Date.now(),startedAt,sessionId))return;
      lastId=value.id;dispatch(value.target);
    } catch(error) {if(!['ENOENT','EBUSY'].includes(error.code) && !(error instanceof SyntaxError))onError(error);}
  };
  const watcher=fs.watch(directory,read);
  watcher.on('error',onError);
  const timer=setInterval(read,1000);timer.unref();
  return ()=>{watcher.close();clearInterval(timer);};
}
module.exports={watchFocusRequests};
