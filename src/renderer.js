'use strict';
const $ = id => document.getElementById(id);
const names = new Map([[15,'DisplayPort 1'],[16,'DisplayPort 2'],[17,'HDMI 1'],[18,'HDMI 2'],[27,'USB-C']]);
let state, initialized = false, dirty = false;
const portName = input => names.get(input) || 'Input ' + input;
function options(select, value) {
  select.replaceChildren();
  for (const [code,name] of names) select.add(new Option(name,String(code)));
  if (!names.has(value)) select.add(new Option('Input ' + value,String(value)));
  select.value=String(value);
}
function render(next) {
  state=next;
  $('status').textContent=next.status;
  $('version').textContent='Switchy ' + next.version;
  $('platform').textContent=next.platform==='darwin' ? 'On this MacBook' : 'On this Windows PC';
  $('windows-port').textContent=portName(next.settings.windowsInput);
  $('mac-port').textContent=portName(next.settings.macInput);
  $('shortcut-label').textContent=next.settings.shortcut.replaceAll('Control','Ctrl').replaceAll('Alt',next.platform==='darwin'?'Option':'Alt').replaceAll('+',' + ');
  for (const id of ['toggle','windows','mac','refresh','save']) $(id).disabled=next.busy;
  $('toggle').firstChild.textContent=next.busy ? 'Working… ' : 'Switch computer ';
  $('mac-display-field').hidden=next.platform!=='darwin';
  $('monitor-field').hidden=next.platform==='darwin';
  const selected=$('monitorId').value;
  $('monitorId').replaceChildren(new Option('Choose a monitor',''));
  for (const display of next.displays) $('monitorId').add(new Option(display.name+' ('+display.id+')', display.id));
  const monitorId=dirty ? selected : next.settings.monitorId;
  if (monitorId && !next.displays.some(d => d.id===monitorId)) $('monitorId').add(new Option('Disconnected: '+monitorId,monitorId));
  $('monitorId').value=monitorId;
  if (!initialized || !dirty) {
    options($('windowsInput'),next.settings.windowsInput); options($('macInput'),next.settings.macInput);
    for (const key of ['shortcut','restoreShortcut','macDisplay']) $(key).value=next.settings[key];
    $('launchAtLogin').checked=next.settings.launchAtLogin;
    initialized=true;
  }
  $('diagnostics').textContent=next.displays.length ? next.displays.map(d => `${d.name}\nID: ${d.id}\nCurrent input: ${d.current==null?'Not available':portName(d.current)}\n${d.capabilities||'Capabilities unavailable.'}`).join('\n\n') : 'No monitor data. Connect your monitor and press Refresh.';
}
function report(error) { $('status').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,''); }
for (const target of ['windows','mac','toggle']) $(target).addEventListener('click', () => window.switchy.switch(target).catch(report));
$('refresh').addEventListener('click', () => window.switchy.refresh().then(render).catch(report));
$('settings-form').addEventListener('input', () => {dirty=true; $('save-status').textContent='Unsaved changes';});
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const settings={...state.settings};
  for (const key of ['monitorId','shortcut','restoreShortcut','macDisplay']) settings[key]=$(key).value.trim();
  for (const key of ['windowsInput','macInput']) settings[key]=Number($(key).value);
  settings.launchAtLogin=$('launchAtLogin').checked;
  try { const next=await window.switchy.save(settings); dirty=false; render(next); $('save-status').textContent='Saved. Your shortcuts are active.'; }
  catch(error) {$('save-status').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,'');}
});
for (const [id,key] of [['deskflow','deskflow'],['mac-help','macHelp'],['releases','releases']]) $(id).addEventListener('click', () => window.switchy.openLink(key).catch(report));
window.switchy.onState(render);
window.switchy.state().then(render).catch(report);
