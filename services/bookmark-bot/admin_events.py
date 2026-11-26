"""Durable per-action admin feed; no screenshots, ZIP bytes, credentials or summaries."""
import json
import logging
import os
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

LABELS={'service.started':'Сервис запущен','bot.started':'Пользователь запустил бота',
        'menu.selected':'Выбран пункт меню','search.requested':'Поиск закладок',
        'widget.selected':'Действие в виджете','widget.sent':'Отправлен виджет',
        'archive.sent':'Отправлен архив','request.failed':'Ошибка обработки'}
CHOICES={'find':'Найти закладки','workshop':'Материалы с митапа','workshop_links':'Материалы с митапа',
         'workshop_zip':'Плеер анимации','q:motion':'Анимация','q:fonts':'Шрифты',
         'q:payment':'Оплата','q:ui':'UI-компоненты','ask':'Новый запрос','g:-1':'Все разделы',
         'g:0':'Референсы','g:1':'Код и компоненты','g:2':'Инструменты','save':'Сохранить импорт','cancel':'Отменить импорт'}

class AdminEvents:
    def __init__(self,path,transport,chat,thread=None,clock=time.time,excluded=()):
        self.path=str(path);self.transport=transport;self.chat=chat;self.thread=thread;self.clock=clock
        self.excluded=set(excluded)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS activity(actor INTEGER PRIMARY KEY,who TEXT,lines TEXT,message INTEGER,revision INTEGER DEFAULT 0,sent INTEGER DEFAULT 0,due REAL DEFAULT 0,attempts INTEGER DEFAULT 0)')
            db.execute('CREATE TABLE IF NOT EXISTS activity_seen(id TEXT PRIMARY KEY,created REAL)')
            # Retire the earlier per-event queue; never replay owner actions from it.
            if db.execute("SELECT 1 FROM sqlite_master WHERE name='events'").fetchone():
                db.execute('UPDATE events SET sent=1')
    @contextmanager
    def connect(self):
        db=sqlite3.connect(self.path,timeout=10)
        try:
            db.execute('PRAGMA journal_mode=WAL')
            with db:yield db
        finally:db.close()
    def record(self,kind,update,details):
        if kind not in LABELS:raise ValueError('Unknown admin event')
        actor=(update.get('widget_query') or update.get('callback_query') or update.get('message') or {}).get('from',{})
        uid=actor.get('id')
        if not isinstance(uid,int) or uid in self.excluded:return
        who=' '.join(str(actor.get(k,'')) for k in ('first_name','last_name')).strip()
        if actor.get('username'):who+=' @'+str(actor['username'])
        who=(who.strip() or 'Пользователь')+' · ID '+str(uid)
        stamp=datetime.fromtimestamp(self.clock(),ZoneInfo('Europe/Moscow')).strftime('%d.%m %H:%M:%S')
        parts=[stamp+' — '+LABELS[kind]]
        for key,value in details.items():
            if key not in ('choice','query','results','scope'):continue
            if key=='choice':
                value=str(value)
                if value.startswith(('save:','cancel:')):value=value.split(':')[0]
                value=CHOICES.get(value,value)
            if key=='scope':value={'archive':'Весь архив','workshop':'Митап'}.get(value,value)
            parts.append(str(value)[:300])
        identity=str(update.get('update_id',uuid.uuid4()))+':'+kind
        with self.connect() as db:
            if db.execute('SELECT 1 FROM activity_seen WHERE id=?',(identity,)).fetchone():return
            db.execute('INSERT INTO activity_seen VALUES(?,?)',(identity,self.clock()))
            db.execute('DELETE FROM activity_seen WHERE created<?',(self.clock()-7*86400,))
            row=db.execute('SELECT lines FROM activity WHERE actor=?',(uid,)).fetchone()
            lines=json.loads(row[0]) if row else []
            lines.append(' · '.join(parts));lines=lines[-40:]
            while len('\n'.join(lines))>3500:lines.pop(0)
            db.execute('INSERT INTO activity(actor,who,lines,revision,due) VALUES(?,?,?,1,?) ON CONFLICT(actor) DO UPDATE SET who=excluded.who,lines=excluded.lines,revision=activity.revision+1,due=excluded.due',
                       (uid,who[:200],json.dumps(lines,ensure_ascii=False),self.clock()))
    def flush(self):
        with self.connect() as db:
            row=db.execute('SELECT actor,who,lines,message,revision FROM activity WHERE revision>sent AND due<=? ORDER BY due LIMIT 1',(self.clock(),)).fetchone()
        if not row:return False
        uid,who,lines,message,revision=row
        if uid in self.excluded:
            with self.connect() as db:db.execute('UPDATE activity SET sent=revision WHERE actor=?',(uid,))
            return False
        payload={'chat_id':self.chat,'text':'Закладки · '+who+'\n\n'+'\n'.join(json.loads(lines)),
                 'link_preview_options':{'is_disabled':True}}
        if message:payload['message_id']=message
        elif self.thread:payload['message_thread_id']=self.thread
        try:
            result=self.transport.call('editMessageText' if message else 'sendMessage',payload)
        except Exception:
            with self.connect() as db:
                db.execute('UPDATE activity SET attempts=attempts+1,due=? WHERE actor=?',(self.clock()+10,uid))
            logging.warning('Admin delivery delayed');return False
        message=message or result['message_id']
        with self.connect() as db:
            db.execute('UPDATE activity SET message=?,sent=?,attempts=0 WHERE actor=?',(message,revision,uid))
        print('Admin activity updated',flush=True);return True
    def start(self):
        def run():
            while True:
                try:sent=self.flush()
                except Exception:
                    logging.warning('Admin queue temporarily unavailable');sent=False
                time.sleep(1 if sent else 3)
        threading.Thread(target=run,daemon=True,name='admin-activity-feed').start()
    @classmethod
    def from_environment(cls,path):
        if os.environ.get('BOOKMARK_ADMIN_EVENTS')!='true':return None
        from worker import Telegram
        token=os.environ.get('BOOKMARK_ADMIN_BOT_TOKEN','');chat=os.environ.get('BOOKMARK_ADMIN_CHAT_ID','')
        thread=os.environ.get('BOOKMARK_ADMIN_THREAD_ID','');owner=os.environ.get('BOOKMARK_BOT_OWNER_ID','')
        if not token or not chat.lstrip('-').isdigit():raise RuntimeError('Admin event route is not configured')
        return cls(path,Telegram(token),int(chat),int(thread) if thread else None,excluded=[int(owner)] if owner.isdigit() else [])
