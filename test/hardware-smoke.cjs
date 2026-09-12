const {_electron:electron,expect}=require('@playwright/test');
const path=require('node:path');
(async()=>{
 const instance=await electron.launch({args:[path.join(__dirname,'..')]});
 try {
  const page=await instance.firstWindow();
  await expect(page.locator('#status')).toContainText('Input control is responding',{timeout:30000});
  await expect(page.locator('#version')).toHaveText('Switchy 0.1.0');
  await page.locator('#windows').click();
  await expect(page.locator('#status')).toContainText('Switch to Windows sent',{timeout:30000});
  await expect.poll(async()=>page.evaluate(async()=>(await window.switchy.refresh()).displays[0]?.current),{timeout:30000,intervals:[2000,3000,5000]}).toBe(15);
  await page.screenshot({path:path.join(__dirname,'..','docs','switchy-windows.png')});
  console.log('PASS: actual ViewSonic input read, Windows input command accepted, readback returned DisplayPort (15), app version 0.1.0.');
 }finally{await instance.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
