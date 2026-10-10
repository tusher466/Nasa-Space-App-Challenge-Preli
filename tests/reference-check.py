import json,subprocess,pathlib,numpy as np
from scipy.stats import linregress,norm
import statsmodels.api as sm
root=pathlib.Path(__file__).resolve().parent.parent
source=json.load(open(root/'public/assets/data.json'))
script="const fs=require('fs'),vm=require('vm'),ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('./public/stats.js','utf8'),ctx);const S=ctx.module.exports,d=require('./public/assets/data.json');console.log(JSON.stringify(d.points.flatMap(p=>Object.keys(p.series).map(k=>({id:p.id,k,hac:S.analyze(p.series[k],'hac'),ols:S.analyze(p.series[k],'ols')})))))"
results=json.loads(subprocess.check_output(['node','-e',script],cwd=root))
for r in results:
 p=next(p for p in source['points'] if p['id']==r['id']);xy=np.array(p['series'][r['k']]);x,y=xy[:,0],xy[:,1];ref=linregress(x,y)
 assert abs(ref.slope-r['ols']['slope'])<1e-10
 assert abs(ref.pvalue-r['ols']['p'])<1e-9
 fit=sm.OLS(y,sm.add_constant(x-x.mean())).fit(cov_type='HAC',cov_kwds={'maxlags':r['hac']['lag'],'use_correction':True})
 assert abs(fit.bse[1]-r['hac']['se'])<1e-10,(r['id'],r['k'])
 assert abs(2*norm.sf(abs(fit.params[1]/fit.bse[1]))-r['hac']['p'])<2e-7
print('PASS: all 64 NASA series match SciPy OLS and statsmodels Newey–West HAC reference calculations.')
