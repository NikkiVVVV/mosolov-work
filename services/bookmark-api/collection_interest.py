"""Fixed-choice survey. Separate from operations notifications."""
import hashlib
import json
import os
import sqlite3
import time
import urllib.request
from pathlib import Path
from ai_search import NoRedirect

def record_interest(payload, client):
    if not isinstance(payload,dict) or set(payload)!={'answer'} or payload['answer'] not in ('yes','no'):
        return 400, 'invalid'
    token=os.environ.get('SURVEY_BOT_TOKEN')
    chat=os.environ.get('SURVEY_CHAT_ID','')
    thread=os.environ.get('SURVEY_THREAD_ID','')
    if os.environ.get('SURVEY_ENABLED')!='true' or not token or not chat.lstrip('-').isdigit() or not thread.isdigit():
        return 503, 'disabled'
    path=Path(os.environ.get('RAILWAY_VOLUME_MOUNT_PATH') or os.environ.get('STATE_DIR','data'))/'collection-interest.sqlite'
    path.parent.mkdir(parents=True,exist_ok=True)
    identity=hashlib.sha256((token+client).encode()).hexdigest()
    now=int(time.time())
    with sqlite3.connect(path,timeout=5) as db:
        db.execute('CREATE TABLE IF NOT EXISTS votes(client TEXT PRIMARY KEY, ts INTEGER, status TEXT)')
        db.execute('BEGIN IMMEDIATE')
        db.execute('DELETE FROM votes WHERE ts < ?', (now-86400,))
        hit=db.execute('SELECT status,ts FROM votes WHERE client=?',(identity,)).fetchone()
        if hit:
            if hit[0]=='sent': return 202,'duplicate'
            if now-hit[1]<60: return 429,'busy'
            db.execute('DELETE FROM votes WHERE client=?',(identity,))
        if db.execute('SELECT count(*) FROM votes').fetchone()[0]>=100: return 429,'limited'
        db.execute('INSERT INTO votes VALUES(?,?,?)',(identity,now,'pending'))
    answer='Да, пригодилась бы' if payload['answer']=='yes' else 'Пока нет'
    text='Закладки · интерес к личной коллекции\n\n'+answer
    body=json.dumps({'chat_id':chat,'message_thread_id':int(thread),'text':text,'link_preview_options':{'is_disabled':True}},ensure_ascii=False).encode()
    request=urllib.request.Request('https://api.telegram.org/bot'+token+'/sendMessage',data=body,headers={'Content-Type':'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request,timeout=5) as response:
            if not json.load(response).get('ok'): raise ValueError()
        with sqlite3.connect(path,timeout=5) as db: db.execute('UPDATE votes SET status=? WHERE client=?',('sent',identity))
        return 202,'sent'
    except Exception:
        with sqlite3.connect(path,timeout=5) as db: db.execute('UPDATE votes SET status=? WHERE client=?',('failed',identity))
        return 503,'delivery_failed'
