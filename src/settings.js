'use strict';

const defaults = {
  monitorId: '', windowsInput: 15, macInput: 17,
  shortcut: 'Control+Alt+Shift+S', restoreShortcut: 'Control+Alt+Shift+W',
  launchAtLogin: false, macDisplay: '1'
};

function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid settings.');
  const result = {};
  for (const key of Object.keys(defaults)) result[key] = value[key] ?? defaults[key];
  for (const key of ['windowsInput', 'macInput']) {
    if (!Number.isInteger(result[key]) || result[key] < 1 || result[key] > 255) throw new Error('Input codes must be numbers from 1 to 255.');
  }
  if (result.windowsInput === result.macInput) throw new Error('Choose different inputs for Windows and Mac.');
  for (const key of ['shortcut', 'restoreShortcut']) {
    if (typeof result[key] !== 'string' || result[key].length > 80 || !/^(?:(?:Control|Alt|Shift|Super|Command|CommandOrControl)\+)+[A-Za-z0-9]$/.test(result[key])) throw new Error('Use a shortcut such as Control+Alt+S.');
  }
  if (result.shortcut.toLowerCase() === result.restoreShortcut.toLowerCase()) throw new Error('The two shortcuts must be different.');
  if (typeof result.monitorId !== 'string' || result.monitorId.length > 300) throw new Error('Invalid monitor.');
  if (typeof result.macDisplay !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,179}$/.test(result.macDisplay)) throw new Error('Enter a valid Mac display number or UUID.');
  if (typeof result.launchAtLogin !== 'boolean') throw new Error('Invalid startup setting.');
  return result;
}

function nextInput(current, settings, platform) {
  if (current === settings.windowsInput) return settings.macInput;
  if (current === settings.macInput) return settings.windowsInput;
  return platform === 'darwin' ? settings.windowsInput : settings.macInput;
}

module.exports = { defaults, validateSettings, nextInput };
