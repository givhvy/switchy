'use strict';

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell, Notification } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { defaults, validateSettings, nextInput } = require('./settings');
const { createMonitor } = require('./monitor');
const { switchWithAudio } = require('./switch-audio');
const { writeSettings } = require('./storage');
const {parseFocusCommand,routeFocusCommand} = require('./focus-command');
const {createFocusQueue} = require('./focus-queue');
const {parseDeskflowState} = require('./focus-state');
const {watchDeskflowLog} = require('./focus-log');
const {createAudioRestorer}=require('./audio-restore');

let window, tray, settings, monitor, settingsFile;
let displays = [], busy = false, quitting = false, lastRequest = null, status = 'Looking for your monitor…';
const initialCommand = parseFocusCommand(process.argv);
let focusQueue,stopFocusWatch,queuedFocus,audioRestorer,controlServer;
function requestFocus(target) {
  audioRestorer?.cancel();
  if(focusQueue)focusQueue.request(target);
  else queuedFocus=target;
}
function recordFocus(value) {
  if(!settingsFile)return;
  try {
    fs.mkdirSync(path.join(path.dirname(settingsFile),'deskflow-focus'),{recursive:true});
    fs.appendFileSync(path.join(path.dirname(settingsFile),'deskflow-focus','result.log'),JSON.stringify({at:new Date().toISOString(),...value})+'\n');
    const file=path.join(path.dirname(settingsFile),'deskflow-focus','result.log');
    if(fs.statSync(file).size>65536)fs.writeFileSync(file,JSON.stringify({at:new Date().toISOString(),...value})+'\n');
  } catch {}
}
const links = {
  deskflow: 'https://github.com/deskflow/deskflow/releases/latest',
  releases: 'https://github.com/givhvy/switchy/releases',
  source: 'https://github.com/givhvy/switchy',
  macHelp: 'https://github.com/waydabber/m1ddc'
};

function state() { return { settings, displays, busy, lastRequest, status, platform: process.platform, version: app.getVersion() }; }
function publish(message) { if (message) status = message; window?.webContents.send('state', state()); }
function persist(value) {
  writeSettings(settingsFile, value);
}
function errorMessage(error) {
  if (error.killed) return 'The monitor did not respond in time. Check DDC/CI in its menu, then refresh.';
  return (error.stderr?.trim() || error.message || String(error)).slice(0,1200);
}
function report(error) {
  publish(errorMessage(error));
  if (!window?.isVisible() && Notification.isSupported()) new Notification({ title: 'Switchy needs attention', body: status }).show();
}
async function refresh() {
  if (busy) return state();
  busy = true; publish('Checking the monitor connection…');
  try {
    displays = await monitor.list(settings);
    if (process.platform === 'win32' && !settings.monitorId && displays.length === 1) {
      settings.monitorId = displays[0].id;
      persist(settings);
    }
    const selected = displays.find(d => d.id === (process.platform === 'darwin' ? settings.macDisplay : settings.monitorId));
    publish(!displays.length ? 'No monitor found. Connect the display, enable DDC/CI, then refresh.' : !selected ? 'Choose your shared monitor in Connection settings.' : selected.readable ? 'Monitor connected. Input control is responding.' : 'Monitor found. Input readback is unavailable; switching may still work.');
  } catch (error) { displays = []; report(error); }
  finally { busy = false; publish(); }
  return state();
}
async function switchTo(target = 'toggle', isCurrent = () => true, focusDriven = false) {
  if (busy) throw new Error('A monitor operation is already running.');
  if (!['toggle','windows','mac'].includes(target)) throw new Error('Invalid switch target.');
  busy = true; publish('Sending the input switch…');
  audioRestorer?.cancel();
  let sent=true;
  try {
    let current = null;
    if (target === 'toggle' && process.platform === 'win32') {
      displays = await monitor.list(settings);
      current = displays.find(d => d.id === settings.monitorId)?.current;
      if (current == null && lastRequest != null) current = lastRequest;
    }
    // macOS cannot read the input with m1ddc. Toggle always requests the other computer.
    const input = target === 'windows' ? settings.windowsInput : target === 'mac' ? settings.macInput : nextInput(current, settings, process.platform);
    if(process.platform==='win32') {
      const started=Date.now();
      const result=await monitor.set(settings,input,{focusTarget:focusDriven?target:undefined,isCurrent});
      if(result?.superseded || result?.sent===false){sent=false;recordFocus({target,phase:'set-refused',reason:result.reason,clientPid:result.clientPid});}
      else {
      lastRequest=input;
      if(focusDriven) {
        if(result?.guarded)recordFocus({at:result.guardAt,target,phase:'guard',allowed:true,clientPid:result.clientPid,elapsedMs:result.guardMs});
        recordFocus({target,phase:'input-sent',input,nativeMs:result?.nativeMs,elapsedMs:Date.now()-started,setMs:result?.setMs,setStartedAt:result?.setStartedAt,sentAt:result?.sentAt});
      }
      publish('Switch to '+(input===settings.windowsInput?'Windows':'MacBook')+' sent. Restoring volume 80 and unmute…');
      for(const display of displays)display.current=null;
      void audioRestorer.restore({...settings},input,isCurrent);
      }
    }else {
    const audioResult = await switchWithAudio(monitor, settings, input, undefined, isCurrent);
    lastRequest = input;
    const computer = input === settings.windowsInput ? 'Windows' : 'MacBook';
    publish('Switch to ' + computer + ' sent. ' + (audioResult.superseded ? 'New focus request queued.' : audioResult.audioRestored ? 'Volume 80 and unmute commands completed.' : 'Audio could not be restored: the monitor may be unreachable from this input.'));
    for (const display of displays) display.current = null;
    }
  } catch (error) { report(error); throw new Error(errorMessage(error)); }
  finally { busy = false; publish(); }
  return {...state(),sent};
}
function registerShortcuts(value) {
  globalShortcut.unregisterAll();
  try {
    const toggle = globalShortcut.register(value.shortcut, () => switchTo().catch(() => {}));
    const restore = globalShortcut.register(value.restoreShortcut, () => switchTo('windows').catch(() => {}));
    if (!toggle || !restore) throw new Error('A shortcut is in use by another app. Choose a different combination.');
  } catch (error) { globalShortcut.unregisterAll(); throw error; }
}
function show() { window.show(); window.focus(); }
function createWindow() {
  window = new BrowserWindow({ show: !initialCommand.background, width: 620, height: 810, minWidth: 420, minHeight: 600, title: 'Switchy', backgroundColor: '#f5f2eb', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname,'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.loadFile(path.join(__dirname,'index.html'));
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback) => callback(false));
  window.on('close', event => { if (!quitting) {event.preventDefault(); window.hide();} });
  window.webContents.on('did-finish-load', () => publish());
}
function createTray() {
  // Two contacts and their bridge echo a physical input selector at tray size.
  const size = 32, pixels = Buffer.alloc(size * size * 4);
  for (let y=6;y<26;y++) for (let x=4;x<28;x++) {
    if ((x<10 || x>21) || (y>=13 && y<=18)) {
      const i=(y*size+x)*4; pixels[i]=68; pixels[i+1]=82; pixels[i+2]=34; pixels[i+3]=255;
    }
  }
  const icon = nativeImage.createFromBitmap(pixels,{width:size,height:size});
  if (process.platform==='darwin') icon.setTemplateImage(true);
  tray = new Tray(icon); tray.setToolTip('Switchy');
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Open Switchy',click:show}, {type:'separator'},
    {label:'Switch to MacBook',click:() => switchTo('mac').catch(()=>{})},
    {label:'Switch to Windows',click:() => switchTo('windows').catch(()=>{})},
    {type:'separator'}, {label:'Quit Switchy',click:() => app.quit()}
  ]));
  tray.on('click',show);
}

if (initialCommand.invalid) app.exit(2);
else if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event,argv) => routeFocusCommand(argv,requestFocus,() => window && show()));
  app.whenReady().then(async () => {
    settingsFile = path.join(app.getPath('userData'),'settings.json');
    let settingsError;
    try { settings = validateSettings(JSON.parse(fs.readFileSync(settingsFile,'utf8'))); }
    catch(error) { settings = {...defaults}; if (error.code!=='ENOENT') settingsError='Saved settings could not be read. Defaults are loaded; save settings to replace them.'; }
    monitor = createMonitor(app.isPackaged ? path.join(process.resourcesPath,'native') : path.join(__dirname,'..','native'));
    audioRestorer=createAudioRestorer({monitor,onResult:result=>{
      recordFocus({phase:'audio-complete',...result});
      publish(result.audioRestored?'Volume 80 and unmute verified.':'Audio could not be restored: the monitor may be unreachable from this input.');
    },onError:error=>recordFocus({phase:'audio-error',message:errorMessage(error)})});
    if(process.platform==='win32') {
      focusQueue=createFocusQueue({
        verify:async target=>{
          if(!settings.followDeskflowFocus)return false;
          const deadline=Date.now()+25000;
          while(busy && Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
          if(busy)return false;
          if(monitor.hasFastFocus)return true;
          const started=Date.now();const local=await monitor.deskflowState();
          const state=parseDeskflowState(local.events || '');
          const allowed=local.connected && state.connected && state.target===target;
          recordFocus({target,phase:'guard',allowed:!!allowed,clientPid:local.processId,error:local.error,elapsedMs:Date.now()-started,nativeMs:local.nativeMs});
          return allowed;
        },
        apply:async(target,isCurrent)=>{
          if(busy || !isCurrent())return;
          recordFocus({target,phase:'write-start'});
          const result=await switchTo(target,isCurrent,true);
          if(result.sent!==false)recordFocus({target,phase:'write-complete',input:lastRequest});
        },
        onError:error=>{recordFocus({phase:'error',message:errorMessage(error)});publish(errorMessage(error));}
      });
      const local=await monitor.deskflowState();
      if(local.logFile)stopFocusWatch=watchDeskflowLog(local.logFile,{
        connected:local.connected,dispatch:requestFocus,invalidate:()=>{focusQueue.cancel();audioRestorer.cancel();},
        revalidateFocus:async target=>{
          if(!settings.followDeskflowFocus)return false;
          const current=await monitor.deskflowState();
          const focus=parseDeskflowState(current.events || '');
          return current.connected===true && focus.connected && focus.target===target;
        },
        onEvent:event=>recordFocus({phase:'observed',...event}),
        onError:error=>recordFocus({phase:'watch-error',message:error.message})
      });
      recordFocus({phase:'watch-start',connected:local.connected,clientPid:local.processId,logFile:local.logFile,error:local.error});
      if(initialCommand.target)requestFocus(initialCommand.target);
      if(queuedFocus)requestFocus(queuedFocus);
    }
    ipcMain.handle('state', () => state());
    ipcMain.handle('refresh', () => refresh());
    ipcMain.handle('switch', (_event,target) => switchTo(target));
    ipcMain.handle('save', async (_event,value) => {
      if (busy) throw new Error('Wait for the monitor operation to finish.');
      const next = validateSettings(value);
      const previous = settings;
      try {
        registerShortcuts(next);
        app.setLoginItemSettings({openAtLogin:next.launchAtLogin});
        persist(next);
      } catch(error) {
        try { registerShortcuts(previous); app.setLoginItemSettings({openAtLogin:previous.launchAtLogin}); } catch {}
        throw error;
      }
      settings=next; lastRequest=null; publish('Settings saved.');
      audioRestorer.cancel();
      return state();
    });
    ipcMain.handle('open-link', (_event,key) => {
      if (!Object.hasOwn(links,key)) throw new Error('Unknown link.');
      return shell.openExternal(links[key]);
    });
    if(process.platform==='win32') {
      const {createControlServer}=require('./control-server');
      controlServer=createControlServer({directory:path.dirname(settingsFile),dispatch:async request=>{
        if(request.action==='state') {
          const local=await monitor.deskflowState();
          const focus=parseDeskflowState(local.events||'');
          const readback=displays.find(d=>d.id===settings.monitorId)?.current;
          const readTarget=readback===settings.windowsInput?'windows':readback===settings.macInput||(settings.windowsInput===15&&settings.macInput===16&&readback===18)?'mac':null;
          return {version:app.getVersion(),monitorId:settings.monitorId,windowsInput:settings.windowsInput,macInput:settings.macInput,follow:settings.followDeskflowFocus,connected:local.connected===true,inputFocus:local.connected&&focus.connected?focus.target:null,displayTarget:lastRequest===settings.windowsInput?'windows':lastRequest===settings.macInput?'mac':readTarget,displayEvidence:lastRequest===null?(readTarget?'readback':'unknown'):'command-acknowledged',role:local.role||'client',error:local.error||null};
        }
        focusQueue.cancel();audioRestorer.cancel();
        const deadline=Date.now()+25000;
        while(busy&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
        if(busy)throw Error('The monitor is busy.');
        if(request.action==='policy') {
          const next={...settings,followDeskflowFocus:request.follow};persist(next);settings=next;publish();
          return {follow:settings.followDeskflowFocus};
        }
        const result=await switchTo(request.target,()=>true,request.requireFocus===true);
        return {sent:result.sent,target:request.target,evidence:'command-acknowledged'};
      }});
      await controlServer.start();
    }
    createWindow(); createTray();
    let shortcutError;
    try { registerShortcuts(settings); } catch(error) { shortcutError=error; }
    await refresh();
    if (settingsError) publish(settingsError);
    if (shortcutError) report(shortcutError);
  }).catch(error => { console.error(error); app.quit(); });
  app.on('activate', () => window && show());
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { quitting=true;controlServer?.close();focusQueue?.stop();stopFocusWatch?.();audioRestorer?.cancel();monitor?.close?.(); });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
