/* Transparent annual-series trend engine. All slopes in input units/year. */
(function(global){
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const erf=x=>{const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+.3275911*x);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));};
const normalP=z=>Math.max(0,Math.min(1,1-erf(Math.abs(z)/Math.SQRT2)));
function logGamma(z){const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];if(z<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);z-=1;let x=.9999999999998099;for(let i=0;i<c.length;i++)x+=c[i]/(z+i+1);const t=z+c.length-.5;return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x);}
function betaCF(a,b,x){let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;let h=d;for(let m=1;m<201;m++){let aa=m*(b-m)*x/((qam+2*m)*(a+2*m));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+2*m)*(qap+2*m));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;let delta=d*c;h*=delta;if(Math.abs(delta-1)<3e-12)break;}return h;}
function ibeta(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log1p(-x));return x<(a+1)/(a+b+2)?bt*betaCF(a,b,x)/a:1-bt*betaCF(b,a,1-x)/b;}
function tP(t,df){return ibeta(df/(df+t*t),df/2,.5);}
function critical(alpha,df=null){let lo=0,hi=20;for(let i=0;i<80;i++){const mid=(lo+hi)/2;const p=df?tP(mid,df):normalP(mid);if(p>alpha)lo=mid;else hi=mid;}return(lo+hi)/2;}
function median(a){a.sort((a,b)=>a-b);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;}
function analyze(series,method='hac',alpha=.05){
 const data=series.filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)).sort((a,b)=>a[0]-b[0]);const n=data.length;if(n<8)return{valid:false,n,p:NaN,q:NaN};
 const xs=data.map(v=>v[0]),ys=data.map(v=>v[1]),xm=mean(xs),ym=mean(ys),dx=xs.map(x=>x-xm);const sxx=dx.reduce((s,v)=>s+v*v,0);if(!sxx)return{valid:false,n};
 const linearSlope=dx.reduce((s,v,i)=>s+v*(ys[i]-ym),0)/sxx,res=ys.map((v,i)=>v-ym-linearSlope*dx[i]),sse=res.reduce((s,v)=>s+v*v,0),sst=ys.reduce((s,v)=>s+(v-ym)**2,0),sigma2=sse/(n-2);
 let v00=sigma2/n,v01=0,v11=sigma2/sxx,lag=0;
 if(method==='hac'){
  lag=Math.min(n-1,Math.floor(4*(n/100)**(2/9)));let a=0,b=0,c=0;
  for(let i=0;i<n;i++){let u=res[i];a+=u*u;b+=u*u*dx[i];c+=u*u*dx[i]*dx[i];}
  for(let l=1;l<=lag;l++){let w=1-l/(lag+1);for(let i=l;i<n;i++){let uu=res[i]*res[i-l]*w;a+=2*uu;b+=uu*(dx[i]+dx[i-l]);c+=2*uu*dx[i]*dx[i-l];}}
  const factor=n/(n-2);v00=a/(n*n)*factor;v01=b/(n*sxx)*factor;v11=c/(sxx*sxx)*factor;
 }
 let slope=linearSlope,se=Math.sqrt(Math.max(0,v11)),p=se<1e-14?(Math.abs(slope)<1e-14?1:0):(method==='ols'?tP(slope/se,n-2):normalP(slope/se));let z=null;
 if(method==='mk'){
  let S=0,slopes=[],ties=new Map();for(let i=0;i<n;i++){ties.set(ys[i],(ties.get(ys[i])||0)+1);for(let j=i+1;j<n;j++){S+=Math.sign(ys[j]-ys[i]);slopes.push((ys[j]-ys[i])/(xs[j]-xs[i]));}}
  const variance=(n*(n-1)*(2*n+5)-[...ties.values()].reduce((s,t)=>s+t*(t-1)*(2*t+5),0))/18;z=variance>0?(S>0?(S-1):S<0?(S+1):0)/Math.sqrt(variance):0;p=normalP(z);slope=median(slopes);se=null;
 }
 const crit=critical(alpha,method==='ols'?n-2:null),low=se!==null?slope-crit*se:null,high=se!==null?slope+crit*se:null;
 let rr=0;for(let i=1;i<n;i++)rr+=res[i]*res[i-1];const rho=sse>1e-20?rr/sse:0;
 return{valid:true,data,n,xm,ym,slope,linearSlope,se,p,q:p,low,high,v00,v01,v11,crit,lag,rho,z,r2:sst>0?1-sse/sst:1,gaps:xs.some((v,i)=>i>0&&v-xs[i-1]!==1),change:slope*(xs[n-1]-xs[0]),first:xs[0],last:xs[n-1],mean:ym};
}
function adjust(results){const r=results.filter(x=>x.valid&&Number.isFinite(x.p)).sort((a,b)=>a.p-b.p);let q=1;for(let i=r.length-1;i>=0;i--){q=Math.min(q,r[i].p*r.length/(i+1));r[i].q=Math.min(1,q);}return results;}
global.EarthStats={analyze,adjust,tP,critical,normalP};if(typeof module!=='undefined')module.exports=global.EarthStats;
})(typeof window!=='undefined'?window:globalThis);
