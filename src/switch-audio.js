'use strict';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function switchWithAudio(monitor, settings, input, wait = sleep) {
  await monitor.set(settings, input);
  for (const delay of [1500, 2000, 3000]) {
    await wait(delay);
    try {
      await monitor.restoreAudio(settings);
      return {audioRestored:true};
    } catch {}
  }
  return {audioRestored:false};
}
module.exports = {switchWithAudio};
