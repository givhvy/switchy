'use strict';
const fs=require('node:fs');
function writeSettings(file,value,io=fs) {
  const temporary=file+'.tmp';
  io.writeFileSync(temporary,JSON.stringify(value,null,2));
  try {io.renameSync(temporary,file);}
  catch(error) {
    if(error.code!=='EXDEV') throw error;
    // Redirected Windows profile folders can reject a same-directory rename.
    io.copyFileSync(temporary,file);
    io.unlinkSync(temporary);
  }
}
module.exports={writeSettings};
