'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);

function createMonitor(nativeDirectory, platform = process.platform) {
  async function windows(args) {
    const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const { stdout } = await run(shell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(nativeDirectory, 'monitor.ps1'), ...args], { windowsHide: true, timeout: 25000, maxBuffer: 1024 * 1024 });
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
    async list(settings) {
      if (platform === 'win32') return windows(['-Action', 'list']);
      if (platform === 'darwin') {
        const description = await mac(['display', 'list']);
        if (!description) return [];
        return [{ id: settings.macDisplay, name: 'External display ' + settings.macDisplay, current: null, readable: false, capabilities: description }];
      }
      throw new Error('Switchy supports Windows and Apple silicon macOS.');
    },
    async set(settings, input) {
      if (platform === 'win32') {
        if (!settings.monitorId) throw new Error('Choose a monitor in Connection settings first.');
        return windows(['-Action', 'set', '-MonitorId', settings.monitorId, '-InputCode', String(input)]);
      }
      if (platform === 'darwin') { await mac(['display', settings.macDisplay, 'set', 'input', String(input)]); return {sent:true}; }
      throw new Error('Unsupported platform.');
    }
  };
}
module.exports = {createMonitor};
