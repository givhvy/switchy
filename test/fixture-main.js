const {app} = require('electron');
const path = require('node:path');
app.setPath('userData',path.join(__dirname,'..','.tmp','test-profile-'+process.pid));
let current=15;
global.testCommands=[];
global.testFailure=false;
global.testEmpty=false;
require('../src/monitor').createMonitor=()=>({
  restoreAudio:async()=>{},
  list:async()=>global.testEmpty?[]:[{id:'test-monitor',name:'Test monitor',current,readable:true,capabilities:'Test fixture: DP 1, HDMI 1, HDMI 2'}],
  set:async(_settings,input)=>{if(global.testFailure)throw new Error('Test monitor rejected the input command.');global.testCommands.push(input);current=input;return {sent:true};}
});
require('../src/main');
