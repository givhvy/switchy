'use strict';

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, shell, Notification } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { defaults, validateSettings, nextInput } = require('./settings');
const { createMonitor } = require('./monitor');

let window, tray, settings, monitor, settingsFile;
let displays = [], busy = false, quitting = false, lastRequest = null, status = 'Looking for your monitor…';
const links = {
  deskflow: 'https://github.com/deskflow/deskflow/releases/latest',
  releases: 'https://github.com/givhvy/switchy/releases',
  source: 'https://github.com/givhvy/switchy',
  macHelp: 'https://github.com/waydabber/m1ddc'
};

function state() { return { settings, displays, busy, lastRequest, status, platform: process.platform, version: app.getVersion() }; }
function publish(message) { if (message) status = message; window?.webContents.send('state', state()); }
function persist(value) {
  fs.writeFileSync(settingsFile + '.tmp', JSON.stringify(value, null, 2));
  fs.renameSync(settingsFile + '.tmp', settingsFile);
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
async function switchTo(target = 'toggle') {
  if (busy) throw new Error('A monitor operation is already running.');
  if (!['toggle','windows','mac'].includes(target)) throw new Error('Invalid switch target.');
  busy = true; publish('Sending the input switch…');
  try {
    let current = null;
    if (target === 'toggle' && process.platform === 'win32') {
      displays = await monitor.list(settings);
      current = displays.find(d => d.id === settings.monitorId)?.current;
      if (current == null && lastRequest != null) current = lastRequest;
    }
    // macOS cannot read the input with m1ddc. Toggle always requests the other computer.
    const input = target === 'windows' ? settings.windowsInput : target === 'mac' ? settings.macInput : nextInput(current, settings, process.platform);
    await monitor.set(settings, input);
    lastRequest = input;
    const computer = input === settings.windowsInput ? 'Windows' : 'MacBook';
    publish('Switch to ' + computer + ' sent. The monitor may take a few seconds.');
    for (const display of displays) display.current = null;
  } catch (error) { report(error); throw new Error(errorMessage(error)); }
  finally { busy = false; publish(); }
  return state();
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
  window = new BrowserWindow({ width: 620, height: 810, minWidth: 420, minHeight: 600, title: 'Switchy', backgroundColor: '#f5f2eb', autoHideMenuBar: true,
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

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => window && show());
  app.whenReady().then(async () => {
    settingsFile = path.join(app.getPath('userData'),'settings.json');
    let settingsError;
    try { settings = validateSettings(JSON.parse(fs.readFileSync(settingsFile,'utf8'))); }
    catch(error) { settings = {...defaults}; if (error.code!=='ENOENT') settingsError='Saved settings could not be read. Defaults are loaded; save settings to replace them.'; }
    monitor = createMonitor(app.isPackaged ? path.join(process.resourcesPath,'native') : path.join(__dirname,'..','native'));
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
      return state();
    });
    ipcMain.handle('open-link', (_event,key) => {
      if (!Object.hasOwn(links,key)) throw new Error('Unknown link.');
      return shell.openExternal(links[key]);
    });
    createWindow(); createTray();
    let shortcutError;
    try { registerShortcuts(settings); } catch(error) { shortcutError=error; }
    await refresh();
    if (settingsError) publish(settingsError);
    if (shortcutError) report(shortcutError);
  }).catch(error => { console.error(error); app.quit(); });
  app.on('activate', () => window && show());
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { quitting=true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
