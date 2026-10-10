"""Refresh reproducible NASA snapshots. Runtime refresh uses server/nasa.mjs."""
import concurrent.futures
import datetime
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent / 'public' / 'assets'
END = datetime.datetime.now(datetime.timezone.utc).year - 1
KEYS = ['T2M', 'PRECTOTCORR', 'RH2M', 'WS10M']
UNITS = {'T2M': 'C', 'PRECTOTCORR': 'mm/day', 'RH2M': '%', 'WS10M': 'm/s'}
PLACES = [('dhaka','Dhaka','South Asia',23.8,90.4),('amazon','Central Amazon','South America',-3.1,-60.0),('arctic','Central Greenland','Arctic',72,-40),('alaska','Interior Alaska','North America',64.8,-147.7),('california','Central California','North America',36.7,-119.8),('sahel','Central Sahel','Africa',13.5,2.1),('congo','Congo Basin','Africa',0.5,23.5),('europe','Central Europe','Europe',50,10),('siberia','Central Siberia','Asia',62,105),('china','Eastern China','Asia',32,118),('australia','Eastern Australia','Oceania',-28,145),('antarctic','Antarctic Peninsula','Antarctica',-65,-64),('indonesia','Borneo','Southeast Asia',0,114),('patagonia','Patagonia','South America',-45,-70),('southafrica','Western Cape','Africa',-33.9,18.4),('japan','Central Japan','Asia',36,138)]

def get(place):
    ident,name,region,lat,lon = place
    url = f'https://power.larc.nasa.gov/api/temporal/monthly/point?parameters={",".join(KEYS)}&community=AG&longitude={lon}&latitude={lat}&start=1981&end={END}&format=JSON'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=65) as response:
                raw = json.load(response)
            params = raw['properties']['parameter']
            fill = raw['header'].get('fill_value', -999)
            def valid(v):
                return isinstance(v, (int,float)) and v != fill and abs(v) < 1e6
            series = {}
            for key in KEYS:
                if raw['parameters'][key]['units'] != UNITS[key]:
                    raise ValueError(f'{key}: source units changed')
                values = params[key]
                series[key] = [[y,values[f'{y}13']] for y in range(1981,END+1) if all(valid(values.get(f'{y}{m:02}')) for m in range(1,14))]
                if len(series[key]) < 8:
                    raise ValueError(f'{key}: insufficient complete annual observations')
            (ROOT/f'power-{ident}.json').write_text(json.dumps(raw))
            point = dict(id=ident,name=name,region=region,lat=lat,lon=lon,series=series,url=url,retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(),productVersion=raw['header']['api']['version'])
            print('OK',ident,{k:len(v) for k,v in series.items()},flush=True)
            return point
        except Exception as error:
            print('Retry',ident,str(error),flush=True)
    raise RuntimeError(f'Could not refresh {ident}; previous combined snapshot preserved')

if __name__ == '__main__':
    ROOT.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        points = list(pool.map(get,PLACES))
    snapshot = dict(retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(),source='NASA POWER Monthly & Annual API; MERRA-2 meteorological parameters',start=1981,end=END,points=points)
    (ROOT/'data.json').write_text(json.dumps(snapshot))
    url = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv'
    with urllib.request.urlopen(url,timeout=65) as response:
        csv = response.read().decode('utf-8')
    if not csv.startswith('Year,') or '64N-90N' not in csv.splitlines()[0]:
        raise ValueError('GISTEMP table format changed')
    (ROOT/'gistemp-zonal.csv').write_text(csv)
    (ROOT/'gistemp-meta.json').write_text(json.dumps(dict(url=url,retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(),productVersion='GISTEMP v4')))
    print('GISTEMP OK',flush=True)
