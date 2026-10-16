"""Bounded real web results; never accepts model-generated URLs."""
import hashlib
import ipaddress
import json
import os
import sqlite3
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from ai_search import NoRedirect

def search_web(query):
    key = os.environ.get('TAVILY_API_KEY')
    if not key or os.environ.get('WEB_SEARCH_ENABLED') != 'true':
        return [], 'disabled'
    path = Path(os.environ.get('RAILWAY_VOLUME_MOUNT_PATH') or os.environ.get('STATE_DIR','data'))/'web-search.sqlite'
    path.parent.mkdir(parents=True,exist_ok=True)
    digest = hashlib.sha256(query.casefold().encode()).hexdigest()
    now = int(time.time())
    with sqlite3.connect(path,timeout=5) as db:
        db.execute('CREATE TABLE IF NOT EXISTS budget(month TEXT PRIMARY KEY, count INTEGER)')
        db.execute('CREATE TABLE IF NOT EXISTS cache(id TEXT PRIMARY KEY, expires INTEGER, data TEXT)')
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM cache WHERE expires < ?', (now,))
        hit = db.execute('SELECT data FROM cache WHERE id=?',(digest,)).fetchone()
        if hit: return json.loads(hit[0]), 'cached'
        month = time.strftime('%Y-%m',time.gmtime(now))
        used = db.execute('SELECT count FROM budget WHERE month=?',(month,)).fetchone()
        if used and used[0] >= 900: return [], 'limit'
        db.execute('INSERT INTO budget VALUES(?,1) ON CONFLICT(month) DO UPDATE SET count=count+1',(month,))
    payload = json.dumps({'query':query,'search_depth':'basic','max_results':3,'include_answer':False,'include_raw_content':False,'auto_parameters':False}).encode()
    request = urllib.request.Request('https://api.tavily.com/search',data=payload,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request,timeout=8) as response:
            raw=response.read(100001)
        if len(raw)>100000: return [], 'unavailable'
        data=json.loads(raw)
        results=[]
        for item in data.get('results',[])[:3]:
            url=item.get('url','')
            u=urlsplit(url)
            if u.scheme!='https' or not u.hostname or u.username or u.password or u.port not in (None,443): continue
            if u.hostname=='localhost' or u.hostname.endswith(('.local','.internal','.localhost','.avito.ru')): continue
            try:
                if not ipaddress.ip_address(u.hostname).is_global: continue
            except ValueError: pass
            results.append({'url':url[:2048],'title':str(item.get('title',u.hostname))[:160],'description':str(item.get('content',''))[:300]})
        with sqlite3.connect(path,timeout=5) as db:
            db.execute('INSERT OR REPLACE INTO cache VALUES(?,?,?)',(digest,now+3600,json.dumps(results)))
        return results, 'ready'
    except Exception:
        return [], 'unavailable'

def augment_search(result, payload):
    if result.get('intent') != 'search': return result
    links,status=search_web(payload['query'])
    return {**result,'external':links,'webStatus':status}
