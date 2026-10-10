const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.EARTHLENS_JSDOM_PATH||'jsdom');
const root=path.resolve(__dirname,'../public'),snapshot=JSON.parse(fs.readFileSync(root+'/assets/data.json'));
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://earthlens.example/',runScripts:'outside-only'}),w=dom.window;
const errors=[],calls=[];let failDhaka=false,failAll=false;
w.addEventListener('error',e=>errors.push(e.message));w.AbortSignal=global.AbortSignal;
w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
const wait=()=>new Promise(r=>setImmediate(r));
(async()=>{
const {powerEndpoint,gistempEndpoint}=await import('../server/nasa.mjs');
w.fetch=async (p,options)=>{
 const u=new URL(p,'https://earthlens.example/');
 if(!u.pathname.startsWith('/api/')){const text=fs.readFileSync(path.join(root,u.pathname),'utf8');return{ok:true,json:async()=>JSON.parse(text),text:async()=>text};}
 calls.push(u);await wait();
 const fail=()=>new Response(JSON.stringify({error:'NASA upstream returned HTTP 503.'}),{status:502});
 if(u.pathname.includes('power')){
  const point=snapshot.points.find(p=>p.lat===Number(u.searchParams.get('lat'))&&p.lon===Number(u.searchParams.get('lon')));
  assert(point,'API mock must use an exact real NASA fixture coordinate');
  return powerEndpoint(new Request(u),{cache:null,fetcher:async()=>failAll||(failDhaka&&point.id==='dhaka')?new Response('unavailable',{status:503}):new Response(fs.readFileSync(root+'/assets/power-'+point.id+'.json'))});
 }
 if(failAll)return fail();
 return gistempEndpoint(new Request(u),{cache:null,fetcher:async()=>new Response(fs.readFileSync(root+'/assets/gistemp-zonal.csv'))});
};
w.eval(fs.readFileSync(root+'/stats.js','utf8'));
w.eval(['icons','workspace','feeds','app'].map(n=>fs.readFileSync(root+'/'+n+'.js','utf8')).join('\n')+'\nwindow.testFeed={state,liveFeed,refreshNASA,restoreNASA,makeWorkspace,applyWorkspace,run};');
const api=w.testFeed,d=w.document,id=v=>d.getElementById(v);
for(let i=0;i<100&&(calls.length<17||api.liveFeed.busy);i++)await wait();
assert.equal(calls.length,17);assert.equal(api.liveFeed.verified,17);assert.equal(api.liveFeed.errors.length,0);assert.match(id('feed-badge').textContent,/NASA connected/);assert.match(id('feed-detail').textContent,/2025/);assert.equal(id('feed-progress').style.width,'100%');
assert.equal(api.state.points.find(p=>p.id==='dhaka').series.T2M.length,45);assert(w.localStorage.getItem('earthlens.nasa.v1'));assert.match(id('provenance-table').textContent,/LAST FETCH/);
const dhaka=api.state.points.find(p=>p.id==='dhaka'),lastRetrieved=dhaka.retrieved,actualSeries=JSON.stringify(dhaka.series);failDhaka=true;
await api.refreshNASA(true);assert.equal(api.liveFeed.verified,16);assert.equal(api.liveFeed.errors.length,1);assert.equal(dhaka.retrieved,lastRetrieved);assert.equal(JSON.stringify(dhaka.series),actualSeries);assert.match(id('feed-badge').textContent,/partial update/);assert.match(id('feed-failures').textContent,/Dhaka.*503/);assert(calls.slice(-17).every(u=>u.searchParams.get('refresh')==='1'));assert(!id('refresh-data').disabled);
failDhaka=false;failAll=true;await api.refreshNASA(true);assert.equal(api.liveFeed.verified,0);assert.equal(api.liveFeed.errors.length,17);assert.equal(JSON.stringify(dhaka.series),actualSeries);assert.match(id('feed-status').textContent,/NASA unavailable/);
failAll=false;
// Exercise adding a coordinate with an unchanged, independently downloaded NASA fixture.
api.state.points=api.state.points.filter(p=>p.id!=='dhaka');api.run();id('add-location-btn').click();id('location-name').value='Dhaka research sample';id('location-lat').value='23.8';id('location-lon').value='90.4';await id('location-form').onsubmit(new w.Event('submit',{cancelable:true}));
const added=api.state.points.find(p=>p.id.startsWith('NASA_'));assert(added);assert.equal(added.lat,23.8);assert.equal(JSON.stringify(added.series),actualSeries);assert(!id('location-dialog').hasAttribute('open'));assert.equal(api.state.selected,added.id);
id('save-workspace').click();const payload=JSON.parse(w.localStorage.getItem('earthlens.workspace.v1'));assert.equal(payload.nasaLocations.length,1);assert(!('series' in payload.nasaLocations[0]));
api.applyWorkspace(payload);const restored=api.state.points.find(p=>p.id===added.id);assert.equal(restored.series.T2M.length,0);api.restoreNASA();assert.equal(restored.series.T2M.length,45);assert.equal(JSON.stringify(restored.series),actualSeries);
id('add-location-btn').click();await id('location-form').onsubmit(new w.Event('submit',{cancelable:true}));assert.match(id('location-error').textContent,/already in the study/);assert(!id('location-submit').disabled);
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: real NASA fixture refresh on open, source dates, forced update, partial/all-source failures, record retention, coordinate fetch, duplicate prevention, and saved coordinate cache restoration.');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
