const {test} = require('node:test');
const assert = require('node:assert/strict');
const {defaults,validateSettings,nextInput} = require('../src/settings');

test('toggle follows actual monitor input, including a manual input change', () => {
  assert.equal(nextInput(15,defaults,'win32'),17);
  assert.equal(nextInput(17,defaults,'win32'),15);
  const changed={...defaults,macInput:18};
  assert.equal(nextInput(18,changed,'win32'),15);
});
test('unknown current input targets the other computer without pretending to know the display state', () => {
  assert.equal(nextInput(null,defaults,'win32'),17);
  assert.equal(nextInput(null,defaults,'darwin'),15);
});
test('invalid and identical ports are rejected before sending hardware commands', () => {
  for (const windowsInput of [-1,0,256,1.5,'15',NaN]) assert.throws(()=>validateSettings({...defaults,windowsInput}));
  assert.throws(()=>validateSettings({...defaults,macInput:15}));
});
test('shortcut validation prevents invalid settings and duplicate bindings', () => {
  for (const shortcut of ['S','Control+','Control+Alt+S; shutdown','',5]) assert.throws(()=>validateSettings({...defaults,shortcut}));
  assert.throws(()=>validateSettings({...defaults,restoreShortcut:defaults.shortcut}));
  assert.equal(validateSettings({...defaults,shortcut:'CommandOrControl+Shift+9'}).shortcut,'CommandOrControl+Shift+9');
});
test('settings whitelist discards unknown properties and validates helper arguments', () => {
  assert.equal(validateSettings({...defaults,command:'malicious'}).command,undefined);
  for (const macDisplay of ['1; rm -rf','../file','--help','']) assert.throws(()=>validateSettings({...defaults,macDisplay}));
  assert.throws(()=>validateSettings({...defaults,launchAtLogin:'yes'}));
});
