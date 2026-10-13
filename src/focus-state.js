'use strict';
function acceptFocusRequest(value,now,startedAt,sessionId) {
  return !!value && typeof value.id==='string' && value.id.length>0 && value.id.length<=100 &&
    ['windows','mac'].includes(value.target) && Number.isInteger(value.createdAt) &&
    value.createdAt>=startedAt && value.createdAt>=now-20000 && value.createdAt<=now+1000 && value.sessionId===sessionId;
}
function parseDeskflowState(text) {
  let connected=false,target=null;
  for(const line of text.split(/\r?\n/)) {
    if(/(?:^|\]\s+)INFO: (started client|stopped client|server is dead)$/.test(line) || /(?:^|\]\s+)WARNING: failed to connect to server/.test(line)) {
      connected=false;target=null;
    } else if(/(?:^|\]\s+)INFO: connected to secure socket$/.test(line)) {
      connected=true;target=null;
    } else if(connected && /(?:^|\]\s+)INFO: entering computer$/.test(line))target='windows';
    else if(connected && /(?:^|\]\s+)INFO: leaving computer$/.test(line))target='mac';
  }
  return {connected,target};
}
function normalizeServerEvent(line) {
  const match=/^(\[[^\]]+\] )INFO: switch from "(?:DESKTOP-S9B3N7M|NotchDash-Mac)" to "(DESKTOP-S9B3N7M|NotchDash-Mac)" at -?\d+,-?\d+$/.exec(line);
  if(match)return match[1]+'INFO: '+(match[2]==='DESKTOP-S9B3N7M'?'entering computer':'leaving computer');
  return line.replace(/INFO: accepted secure socket$/,'INFO: connected to secure socket').replace(/INFO: (started server|stopped server)$/,'INFO: stopped client');
}
module.exports={acceptFocusRequest,parseDeskflowState,normalizeServerEvent};
