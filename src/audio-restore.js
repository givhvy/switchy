'use strict';
const {restoreMonitorAudio}=require('./switch-audio');
function abortableWait(ms,signal) {
  return new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();};
    const timer=setTimeout(finish,ms);
    signal.addEventListener('abort',finish,{once:true});if(signal.aborted)finish();
  });
}
function createAudioRestorer({monitor,onResult=()=>{},onError=()=>{},wait=abortableWait}) {
  let controller=null;
  return {
    cancel(){controller?.abort();controller=null;},
    restore(settings,input,isCurrent=()=>true) {
      controller?.abort();const request=new AbortController();controller=request;
      const current=()=>controller===request && !request.signal.aborted && isCurrent();
      return restoreMonitorAudio(monitor,settings,(ms)=>wait(ms,request.signal),current)
        .then(result=>{if(current())onResult({input,...result});return result;})
        .catch(error=>{if(current())onError(error);return {audioRestored:false};});
    }
  };
}
module.exports={createAudioRestorer};
