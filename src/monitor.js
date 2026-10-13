'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const {createNativeWorker}=require('./native-worker');

function createMonitor(nativeDirectory, platform = process.platform) {
  const worker=platform==='win32' && fs.existsSync(path.join(nativeDirectory,'SwitchyNative.dll')) ? createNativeWorker(nativeDirectory) : null;
  async function windows(args, script = 'monitor.ps1') {
    const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const { stdout } = await run(shell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(nativeDirectory, script), ...args], { windowsHide: true, timeout: 25000, maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout.trim());
  }
  async function mac(args) {
    const binary = [path.join(nativeDirectory, 'm1ddc'), '/opt/homebrew/bin/m1ddc', '/usr/local/bin/m1ddc'].find(p => fs.existsSync(p));
    if (!binary) throw new Error('The Mac monitor helper is missing. Reinstall the Apple silicon release, or install m1ddc with Homebrew.');
    const { stdout, stderr } = await run(binary, args, { timeout: 15000, maxBuffer: 1024 * 1024 });
    if (/error|failed|unable|not found/i.test(stdout + stderr)) throw new Error((stdout + stderr).trim());
    return stdout.trim();
  }
  return {
    hasFastFocus:!!worker,
    async deskflowState() {
      return platform === 'win32' ? worker ? worker.request({action:'state'}) : windows([], 'deskflow-state.ps1') : {connected:false,events:''};
    },
    async list(settings) {
      if (platform === 'win32') return windows(['-Action', 'list']);
      if (platform === 'darwin') {
        const description = await mac(['display', 'list']);
        if (!description) return [];
        return [{ id: settings.macDisplay, name: 'External display ' + settings.macDisplay, current: null, readable: false, capabilities: description }];
      }
      throw new Error('Switchy supports Windows and Apple silicon macOS.');
    },
    async restoreAudio(settings,isCurrent=()=>true) {
      if (platform === 'win32') {
        if(!worker)return windows(['-Action','audio','-MonitorId',settings.monitorId]);
        for(const step of ['volume','unmute','verify-volume','verify-mute']) {
          if(!isCurrent())throw Error('Audio request superseded.');
          if(step==='verify-volume')await new Promise(resolve=>setTimeout(resolve,200));
          const result=await worker.request({action:'audio-step',step,monitorId:settings.monitorId},{priority:0,isCurrent});
          if(result.superseded)throw Error('Audio request superseded.');
        }
        return;
      }
      if (platform === 'darwin') {
        await mac(['display', settings.macDisplay, 'set', 'volume', '80']);
        await mac(['display', settings.macDisplay, 'set', 'mute', 'off']);
        return;
      }
      throw new Error('Unsupported platform.');
    },
    async set(settings, input,options={}) {
      if (platform === 'win32') {
        if (!settings.monitorId) throw new Error('Choose a monitor in Connection settings first.');
        if(worker)return worker.request({action:options.focusTarget?'focus':'set',target:options.focusTarget,monitorId:settings.monitorId,input},{priority:2,isCurrent:options.isCurrent});
        return windows(['-Action', 'set', '-MonitorId', settings.monitorId, '-InputCode', String(input)]);
      }
      if (platform === 'darwin') { await mac(['display', settings.macDisplay, 'set', 'input', String(input)]); return {sent:true}; }
      throw new Error('Unsupported platform.');
    },
    close(){worker?.close();}
  };
}
module.exports = {createMonitor};
