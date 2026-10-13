const {_electron:electron,expect}=require('@playwright/test');
const path=require('node:path');
(async()=>{
 const instance=await electron.launch({args:[path.join(__dirname,'focus-fixture.cjs'),'--background']});
 try {
  await instance.firstWindow();
  await expect.poll(()=>instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.isLoading())).toBe(false);
  expect(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  await instance.evaluate(({app})=>app.emit('second-instance',{},['app','--deskflow-focus=windows']));
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls)).toEqual([15]);
  await instance.evaluate(({app})=>{global.testFocus='mac';app.emit('second-instance',{},['app','--deskflow-focus=mac']);});
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls),{timeout:10000}).toEqual([15,16]);
  await instance.evaluate(({app})=>app.emit('second-instance',{},['app','--deskflow-focus=toggle']));
  await new Promise(resolve=>setTimeout(resolve,400));
  expect(await instance.evaluate(()=>global.focusCalls)).toEqual([15,16]);
  expect(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible())).toBe(false);
  expect(await instance.evaluate(({globalShortcut})=>globalShortcut.isRegistered('Control+Shift+K'))).toBe(false);
  await instance.evaluate(()=>global.appendFocus('windows'));
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls),{timeout:10000}).toEqual([15,16,15]);
  await instance.evaluate(()=>global.appendFocus('mac'));
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls),{timeout:10000}).toEqual([15,16,15,16]);
  await instance.evaluate(()=>{global.holdAudio=true;global.appendFocus('windows');});
  await expect.poll(()=>instance.evaluate(()=>global.audioPending),{timeout:5000}).toBe(true);
  await instance.evaluate(()=>global.appendFocus('mac'));
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls),{timeout:2000}).toEqual([15,16,15,16,15,16]);
  const elapsed=await instance.evaluate(()=>global.focusDurations.at(-1));expect(elapsed).toBeLessThan(500);
  await instance.evaluate(()=>{global.holdAudio=false;global.releaseAudio();});
  await instance.evaluate(()=>{global.testConnected=false;global.truncateFocusLog();});
  await new Promise(resolve=>setTimeout(resolve,600));
  await instance.evaluate(()=>global.appendFocus('windows'));
  await new Promise(resolve=>setTimeout(resolve,600));
  expect(await instance.evaluate(()=>global.focusCalls)).toEqual([15,16,15,16,15,16]);
  await instance.evaluate(()=>{global.testConnected=true;global.appendFocus('windows');});
  await expect.poll(()=>instance.evaluate(()=>global.focusCalls),{timeout:5000}).toEqual([15,16,15,16,15,16,15]);
  console.log('PASS: hidden startup, fresh log/atomic guard input15/16, new input while old audio pending ('+elapsed+'ms simulated), no K registration, authenticated recovery after truncation without TLS log replay.');
 } finally {await instance.evaluate(({app})=>app.exit(0)).catch(()=>{});await instance.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
