'use strict';
const fs=require('node:fs');
const net=require('node:net');
const crypto=require('node:crypto');
const path=require('node:path');

// The endpoint is local only; the per-launch credential stays in the user's profile.
function createControlServer({directory,dispatch}) {
  const token=crypto.randomBytes(32).toString('hex');
  const pipe='\\\\.\\pipe\\switchy-control-'+crypto.createHash('sha256').update(directory).digest('hex').slice(0,24);
  const file=path.join(directory,'control.json');
  let chain=Promise.resolve();
  const server=net.createServer(socket=>{
    let text='',used=false;
    socket.setEncoding('utf8');socket.setTimeout(30000,()=>socket.destroy());
    socket.on('error',()=>{});
    socket.on('data',chunk=>{
      if(used)return;
      text+=chunk;
      if(Buffer.byteLength(text)>4096){socket.destroy();return;}
      if(!text.includes('\n'))return;
      used=true;
      const execute=async()=>{
        try {
          const request=JSON.parse(text.trim());
          if(typeof request.token!=='string' || !/^[a-f0-9]{64}$/.test(request.token) || !crypto.timingSafeEqual(Buffer.from(token),Buffer.from(request.token)))throw Error('Local control authentication failed.');
          if(!['state','policy','display'].includes(request.action))throw Error('Unknown local action.');
          if(request.action==='policy' && typeof request.follow!=='boolean')throw Error('Invalid focus policy.');
          if(request.action==='display' && !['mac','windows'].includes(request.target))throw Error('An explicit display target is required.');
          if(request.requireFocus!==undefined&&typeof request.requireFocus!=='boolean')throw Error('Invalid focus guard.');
          const value=await dispatch(request);
          if(!socket.destroyed)socket.end(JSON.stringify({ok:true,value})+'\n');
        }catch(error){if(!socket.destroyed)socket.end(JSON.stringify({ok:false,error:error.message})+'\n');}
      };
      chain=chain.then(execute,execute);
    });
  });
  return {
    async start(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(pipe,resolve);});fs.writeFileSync(file,JSON.stringify({version:1,pipe,token,pid:process.pid}),{mode:0o600});},
    close(){server.close();try{if(JSON.parse(fs.readFileSync(file)).token===token)fs.unlinkSync(file);}catch{}},
  };
}
module.exports={createControlServer};
