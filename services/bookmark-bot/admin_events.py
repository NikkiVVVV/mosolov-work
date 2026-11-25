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
CHOICES={'find':'Найти закладки','workshop':'Материалы с воркшопа','workshop_links':'Ссылки с презентации',
         'workshop_zip':'Интерфейс для работы с анимацией','q:motion':'Анимация','q:fonts':'Шрифты',
         'q:payment':'Оплата','q:ui':'UI-компоненты','ask':'Новый запрос','g:-1':'Все разделы',
         'g:0':'Референсы','g:1':'Код и компоненты','g:2':'Инструменты','save':'Сохранить импорт','cancel':'Отменить импорт'}

class AdminEvents:
    def __init__(self,path,transport,chat,thread=None,clock=time.time):
        self.path=str(path);self.transport=transport;self.chat=chat;self.thread=thread;self.clock=clock
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,payload TEXT NOT NULL,'
                       'sent INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,due REAL NOT NULL)')
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
        who=' '.join(str(actor.get(k,'')) for k in ('first_name','last_name')).strip()
        if actor.get('username'):who+=' @'+str(actor['username'])
        if actor.get('id'):who+=' · ID '+str(actor['id'])
        lines=['Закладки · '+LABELS[kind],datetime.fromtimestamp(self.clock(),ZoneInfo('Europe/Moscow')).strftime('%d.%m %H:%M:%S МСК')]
        if who.strip():lines.append(who.strip()[:200])
        for key,value in details.items():
            if key not in ('choice','query','results','scope','catalog'):continue
            labels={'choice':'Выбор','query':'Запрос','results':'Результатов','scope':'Раздел','catalog':'Закладок'}
            if key=='choice':
                value=str(value)
                if value.startswith(('save:','cancel:')):value=value.split(':')[0]
                value=CHOICES.get(value,value)
            if key=='scope':value={'archive':'Весь архив','workshop':'Воркшоп'}.get(value,value)
            lines.append(labels[key]+': '+str(value)[:500])
        payload={'chat_id':self.chat,'text':'\n'.join(lines),'link_preview_options':{'is_disabled':True}}
        if self.thread:payload['message_thread_id']=self.thread
        identity=str(update.get('update_id',uuid.uuid4()))+':'+kind
        with self.connect() as db:
            db.execute('DELETE FROM events WHERE sent=1 AND due<?',(self.clock()-7*86400,))
            if db.execute('SELECT count(*) FROM events WHERE sent=0').fetchone()[0]>=10000:
                logging.warning('Admin event queue full')
                return
            db.execute('INSERT OR IGNORE INTO events(id,payload,due) VALUES(?,?,?)',
                       (identity,json.dumps(payload,ensure_ascii=False),self.clock()))
    def flush(self):
        with self.connect() as db:
            row=db.execute('SELECT id,payload,attempts FROM events WHERE sent=0 AND due<=? ORDER BY due LIMIT 1',(self.clock(),)).fetchone()
        if not row:return False
        try:
            self.transport.call('sendMessage',json.loads(row[1]))
        except Exception:
            with self.connect() as db:
                db.execute('UPDATE events SET attempts=attempts+1,due=? WHERE id=?',
                           (self.clock()+min(300,2**min(row[2]+1,8)),row[0]))
            logging.warning('Admin delivery delayed')
            return False
        with self.connect() as db:db.execute('UPDATE events SET sent=1,due=? WHERE id=?',(self.clock(),row[0]))
        print('Admin event delivered',flush=True)
        return True
    def start(self):
        def run():
            while True:
                try:sent=self.flush()
                except Exception:
                    logging.warning('Admin queue temporarily unavailable');sent=False
                time.sleep(1 if sent else 3)
        threading.Thread(target=run,daemon=True,name='admin-event-feed').start()
    @classmethod
    def from_environment(cls,path):
        if os.environ.get('BOOKMARK_ADMIN_EVENTS')!='true':return None
        from worker import Telegram
        token=os.environ.get('BOOKMARK_ADMIN_BOT_TOKEN','')
        chat=os.environ.get('BOOKMARK_ADMIN_CHAT_ID','')
        thread=os.environ.get('BOOKMARK_ADMIN_THREAD_ID','')
        if not token or not chat.lstrip('-').isdigit():raise RuntimeError('Admin event route is not configured')
        return cls(path,Telegram(token),int(chat),int(thread) if thread else None)
