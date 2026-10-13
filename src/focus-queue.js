'use strict';
function createFocusQueue({verify,apply,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),coalesceMs=15,onError=()=>{}}) {
  let pending=null,running=null,revision=0,stopped=false;
  async function drain() {
    while(pending && !stopped) {
      await wait(coalesceMs);
      if(stopped)break;
      const target=pending,version=revision;pending=null;
      try {
        if(!await verify(target) || stopped || version!==revision)continue;
        await apply(target,()=>!stopped && version===revision);
      } catch(error) {onError(error);}
    }
  }
  function start() {
    running=drain().finally(()=>{running=null;if(pending && !stopped)return start();});
    return running;
  }
  return {
    request(target) {
      if(!['windows','mac'].includes(target))throw Error('Invalid focus target.');
      if(stopped)return Promise.resolve();
      pending=target;revision++;
      if(!running)start();
      return running;
    },
    stop(){stopped=true;pending=null;revision++;},
    cancel(){pending=null;revision++;}
  };
}
module.exports={createFocusQueue};
