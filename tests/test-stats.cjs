const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),context={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/stats.js'),'utf8'),context);const S=context.module.exports;
const linear=Array.from({length:20},(_,i)=>[2000+i,3+.2*i]);for(const method of ['ols','hac','mk']){const r=S.analyze(linear,method);assert(r.valid);assert(Math.abs(r.slope-.2)<1e-10);assert(r.p<.001);assert(Math.abs(r.change-3.8)<1e-10);}
const constant=Array.from({length:20},(_,i)=>[2000+i,5]);for(const method of ['ols','hac','mk']){const r=S.analyze(constant,method);assert.equal(r.slope,0);assert(Math.abs(r.p-1)<1e-6);}
assert.equal(S.analyze(linear.slice(0,7)).valid,false);
assert(Math.abs(S.tP(2.2281388519649385,10)-.05)<1e-8);assert(Math.abs(S.critical(.05,10)-2.2281388519649385)<1e-8);
const adjusted=S.adjust([.01,.04,.03,.002].map(p=>({valid:true,p})));assert.deepEqual(adjusted.map(r=>+r.q.toFixed(6)),[.02,.04,.04,.008]);
const gaps=S.analyze(linear.filter((_,i)=>i!==5));assert.equal(gaps.gaps,true);
const ties=S.analyze(Array.from({length:16},(_,i)=>[2000+i,Math.floor(i/2)]),'mk');assert(ties.p<.001);
const data=require('../public/assets/data.json');assert.equal(data.points.length,16);for(const p of data.points)for(const key of ['T2M','PRECTOTCORR','RH2M','WS10M']){assert.equal(p.series[key].length,45);assert.equal(p.series[key][0][0],1981);assert.equal(p.series[key].at(-1)[0],2025);for(const method of ['hac','ols','mk']){const r=S.analyze(p.series[key],method);assert(Number.isFinite(r.slope));assert(r.p>=0&&r.p<=1);if(method!=='mk'){assert(r.low<=r.slope&&r.high>=r.slope);}}}
console.log('PASS: trends, constant series, Student t, BH FDR, gaps, ties, and 192 NASA point/variable/method combinations.');
