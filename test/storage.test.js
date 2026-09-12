const {test}=require('node:test');
const assert=require('node:assert/strict');
const {writeSettings}=require('../src/storage');
test('redirected profile rename falls back to copying the completed settings file',()=>{
 const calls=[];
 const io={writeFileSync:(...args)=>calls.push(['write',...args]),renameSync:()=>{throw Object.assign(new Error(),{code:'EXDEV'});},copyFileSync:(...args)=>calls.push(['copy',...args]),unlinkSync:(...args)=>calls.push(['unlink',...args])};
 writeSettings('settings.json',{port:15},io);
 assert.deepEqual(calls.map(c=>c[0]),['write','copy','unlink']);
 assert.equal(calls[0][2],'{\n  "port": 15\n}');
});
test('permission failures are propagated instead of bypassed',()=>{
 const io={writeFileSync:()=>{},renameSync:()=>{throw Object.assign(new Error('denied'),{code:'EACCES'});}};
 assert.throws(()=>writeSettings('settings.json',{},io),{code:'EACCES'});
});
