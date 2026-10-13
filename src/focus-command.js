'use strict';
function parseFocusCommand(argv) {
  const flags=argv.filter(value=>value.startsWith('--deskflow-focus'));
  const match=flags.length===1 && /^--deskflow-focus=(windows|mac)$/.exec(flags[0]);
  return {target:match ? match[1] : null,invalid:flags.length>0 && !match,background:argv.includes('--background') || flags.length>0};
}
function routeFocusCommand(argv,dispatch,show) {
  const command=parseFocusCommand(argv);
  if(command.invalid)return false;
  if(command.target)dispatch(command.target);
  else if(!command.background)show();
  return true;
}
module.exports={parseFocusCommand,routeFocusCommand};
