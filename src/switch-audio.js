'use strict';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function switchWithAudio(monitor, settings, input, wait = sleep, isCurrent = () => true) {
  await monitor.set(settings, input);
  return restoreMonitorAudio(monitor,settings,wait,isCurrent);
}
async function restoreMonitorAudio(monitor,settings,wait=sleep,isCurrent=()=>true) {
  for (const delay of [1500, 2000, 3000]) {
    if (!isCurrent()) return {audioRestored:false,superseded:true};
    await wait(delay);
    if (!isCurrent()) return {audioRestored:false,superseded:true};
    try {
      await monitor.restoreAudio(settings,isCurrent);
      if(!isCurrent())return {audioRestored:false,superseded:true};
      return {audioRestored:true};
    } catch {}
  }
  return {audioRestored:false};
}
module.exports = {switchWithAudio,restoreMonitorAudio};
