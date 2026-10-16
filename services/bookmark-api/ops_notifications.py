"""Opt-in, content-free operations notifications. No token, webhook or polling changes."""
import asyncio
from collections import Counter
from contextlib import contextmanager
import random
from datetime import datetime, timedelta
import hashlib
import json
import logging
import os
from pathlib import Path
import sqlite3
import time
import uuid
from zoneinfo import ZoneInfo

LOG = logging.getLogger(__name__)
CHAT = -1003370564305
PROJECTS = {
    'mayonez': ('Майонез', 2, 'https://t.me/Maonez_admin_bot'),
    'idea_radar': ('Idea Radar', 4, 'https://t.me/OpIdr_bot'),
    'bookmarks': ('Избранные закладки', 3, 'https://mosolov.work'),
    'site': ('Анализ сайта', 5, 'https://t.me/Pipelineagent_bot'),
}
# Only fixed labels and counts reach Telegram. No caller-provided text or metadata.
EVENTS = {
    'bookmarks': {
        'search.recorded': ('Поисковых запросов сайта', 'summary'),
        'ai_search.completed': ('Завершено AI-поисков', 'summary'),
        'annotation.completed': ('Завершено разметок', 'summary'),
        'backend.failed': ('Технических ошибок API', 'incident'),
    },
    'site': {
        'scan.started': ('Запущено полных проверок', 'summary'),
        'scan.completed': ('Завершено полных проверок', 'summary'),
        'scan.blocked': ('Сайтов не прошли проверку доступности', 'summary'),
        'scan.cancelled': ('Отменено проверок', 'summary'),
        'scan.failed': ('Технических ошибок анализа', 'incident'),
        'public.started': ('Запущено быстрых проверок', 'summary'),
        'public.completed': ('Завершено быстрых проверок', 'summary'),
        'public.failed': ('Не завершено быстрых проверок', 'summary'),
        'lead.requested': ('Заявок на полный разбор', 'action'),
    },
    'mayonez': {
        'handling.finished': ('Обработано сообщений и действий', 'summary'),
        'processing.error': ('Ошибок обработки', 'incident'),
        'feedback.received': ('Новых обращений обратной связи', 'action'),
    },
    'idea_radar': {
        'analysis.started': ('Запущено анализов', 'summary'),
        'analysis.completed': ('Завершено анализов', 'summary'),
        'analysis.cancelled': ('Отменено анализов', 'summary'),
        'analysis.failed': ('Ошибок анализа', 'incident'),
        'survey.completed': ('Пройдено опросов', 'summary'),
        'access.requested': ('Заявок на расширение доступа', 'action'),
    },
}


def next_summary(now):
    local = datetime.fromtimestamp(now, ZoneInfo('Europe/Moscow'))
    # A complete calendar day's counters are sent at 09:00 the next day.
    return (local + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0).timestamp()


class Queue:
    def __init__(self, path, project, clock=time.time):
        if project not in PROJECTS:
            raise ValueError('unknown_project')
        self.path, self.project, self.clock = Path(path), project, clock
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY, kind TEXT NOT NULL, lane TEXT NOT NULL,
              created REAL NOT NULL, due REAL NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
              lease TEXT, lease_until REAL, attempts INTEGER NOT NULL DEFAULT 0,
              message_id INTEGER, delivered REAL);
            CREATE INDEX IF NOT EXISTS ready ON events(state,due);
            ''')
            identity = json.dumps([project, CHAT, PROJECTS[project][1], 7])
            old = db.execute("SELECT value FROM meta WHERE key='identity'").fetchone()
            if old and old[0] != identity:
                raise ValueError('queue_route_changed')
            db.execute("INSERT OR IGNORE INTO meta VALUES ('identity',?)", (identity,))

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=0.1)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA synchronous=FULL')
        try:
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    def add(self, kind, event_id=None):
        if kind not in EVENTS[self.project]:
            raise ValueError('unknown_event')
        event_id = event_id or str(uuid.uuid4())
        if not isinstance(event_id, str) or not 1 <= len(event_id) <= 120:
            raise ValueError('invalid_id')
        # Source receipt identifiers never leave this queue, even if a caller makes a mistake.
        receipt = hashlib.sha256((self.project + ':' + event_id).encode()).hexdigest()
        now = self.clock()
        lane = EVENTS[self.project][kind][1]
        due = next_summary(now) if lane == 'summary' else now
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            prior = db.execute('SELECT kind FROM events WHERE id=?', (receipt,)).fetchone()
            if prior:
                if prior['kind'] != kind:
                    raise ValueError('event_id_conflict')
                return False
            # Never delete pending events to make room. Caller records a safe failure metric.
            if db.execute("SELECT count(*) FROM events WHERE state!='sent'").fetchone()[0] >= 10000:
                raise RuntimeError('queue_full')
            db.execute('INSERT INTO events(id,kind,lane,created,due) VALUES (?,?,?,?,?)',
                       (receipt, kind, lane, now, due))
        return True

    def claim(self):
        now = self.clock()
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute("DELETE FROM events WHERE state='sent' AND delivered<?", (now-30*86400,))
            db.execute("UPDATE events SET state='pending',lease=NULL WHERE state='leased' AND lease_until<=?", (now,))
            blocked = db.execute("SELECT value FROM meta WHERE key='blocked'").fetchone()
            gate = db.execute("SELECT value FROM meta WHERE key='next_send'").fetchone()
            if blocked or (gate and float(gate[0]) > now):
                return None
            for lane in ('incident', 'action', 'summary'):
                gate = db.execute('SELECT value FROM meta WHERE key=?', ('lane:'+lane,)).fetchone()
                if gate and float(gate[0]) > now:
                    continue
                row = db.execute("SELECT due FROM events WHERE state='pending' AND lane=? AND due<=? ORDER BY due LIMIT 1", (lane,now)).fetchone()
                if not row:
                    continue
                # Never mix summary days. A backlog may require several bounded batches.
                rows = db.execute("SELECT * FROM events WHERE state='pending' AND lane=? AND due<=? AND (?!='summary' OR due=?) ORDER BY created LIMIT 500", (lane,now,lane,row['due'])).fetchall()
                lease = str(uuid.uuid4())
                db.executemany("UPDATE events SET state='leased',lease=?,lease_until=? WHERE id=?", ((lease,now+120,r['id']) for r in rows))
                # Persist the group budget before network I/O; at most 5 sends/min per bot.
                db.execute("INSERT OR REPLACE INTO meta VALUES ('next_send',?)", (str(now+30),))
                return lease, lane, rows
        return None

    def finish(self, lease, lane, message_id):
        with self.connect() as db:
            db.execute("UPDATE events SET state='sent',message_id=?,delivered=?,lease=NULL WHERE lease=?", (message_id,self.clock(),lease))
            if lane in ('incident', 'action'):
                db.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', ('lane:'+lane, str(self.clock()+300)))

    def fail(self, lease, *, retry_after=None, blocked=False):
        now = self.clock()
        with self.connect() as db:
            row = db.execute('SELECT max(attempts) FROM events WHERE lease=?',(lease,)).fetchone()
            attempts = row[0] or 0
            delay = retry_after if retry_after is not None else min(3600,5*2**min(attempts,10)) + random.uniform(0, 3)
            db.execute("UPDATE events SET state='pending',lease=NULL,due=max(due,?),attempts=attempts+1 WHERE lease=?", (now+delay,lease))
            if retry_after is not None:
                db.execute("INSERT OR REPLACE INTO meta VALUES ('next_send',?)", (str(now+max(30,delay)),))
            if blocked:
                db.execute("INSERT OR REPLACE INTO meta VALUES ('blocked','telegram_route_rejected')")

    def render(self, lane, rows):
        name, topic, url = PROJECTS[self.project]
        heading = {'incident':'Инцидент', 'action':'Требует внимания', 'summary':'Сводка'}[lane]
        counts = Counter(row['kind'] for row in rows)
        lines = [f'{name} · {heading}']
        if lane == 'summary':
            day = datetime.fromtimestamp(rows[0]['created'],ZoneInfo('Europe/Moscow')).date()
            lines.append(f'За {day:%d.%m.%Y} · пакет {len(rows)} событий')
        for kind, n in sorted(counts.items()):
            lines.append(f'{EVENTS[self.project][kind][0]}: {n}')
        first = datetime.fromtimestamp(min(r['created'] for r in rows),ZoneInfo('Europe/Moscow'))
        last = datetime.fromtimestamp(max(r['created'] for r in rows),ZoneInfo('Europe/Moscow'))
        lines.append(f'Период: {first:%d.%m %H:%M} — {last:%d.%m %H:%M} МСК')
        delivery = hashlib.sha256('|'.join(sorted(r['id'] for r in rows)).encode()).hexdigest()[:10]
        lines.append('Пакет: '+delivery)
        return dict(chat_id=CHAT, message_thread_id=7 if lane=='incident' else topic,
                    text='\n'.join(lines), parse_mode=None,
                    disable_notification=lane=='summary',
                    link_preview_options={'is_disabled':True},
                    reply_markup={'inline_keyboard':[[{'text':'Открыть админку','url':url}]]})

    async def deliver_once(self, bot):
        item = await asyncio.to_thread(self.claim)
        if not item:
            return False
        lease,lane,rows = item
        try:
            message = await asyncio.wait_for(bot.send_message(**self.render(lane,rows)),timeout=20)
        except asyncio.CancelledError:
            raise  # Lease makes a cancelled in-flight delivery recoverable.
        except Exception as exc:
            name = type(exc).__name__
            retry = getattr(exc,'retry_after',None)
            if not isinstance(retry,(int,float)) or isinstance(retry,bool):
                retry = None
            await asyncio.to_thread(self.fail,lease,retry_after=max(1,retry)+1 if retry is not None else None,
                                    blocked=name in ('TelegramForbiddenError','TelegramBadRequest','TelegramUnauthorizedError'))
            LOG.warning('Operations delivery failed project=%s class=%s',self.project,name)
            return False
        await asyncio.to_thread(self.finish,lease,lane,message.message_id)
        return True


_queue = None
_task = None
_requested = False
capture_failures = 0


def enabled():
    return _requested


async def record(kind, event_id=None):
    global capture_failures
    if not _requested:
        return
    if _queue is None:
        capture_failures += 1
        LOG.error('Operations capture unavailable total=%s',capture_failures)
        return
    try:
        await asyncio.to_thread(_queue.add,kind,event_id)
    except Exception as exc:
        capture_failures += 1
        LOG.error('Operations capture failed class=%s total=%s',type(exc).__name__,capture_failures)


async def start(bot, project, path):
    global _queue,_task,_requested
    _requested = os.getenv('OPERATIONS_ENABLED') == '1'
    if not _requested:
        return
    try:
        _queue = await asyncio.to_thread(Queue,path,project)
    except Exception as exc:
        # Fail closed: do not fall back to transmitting the old personal payloads.
        LOG.error('Operations queue unavailable class=%s',type(exc).__name__)
        return
    async def worker():
        while True:
            try:
                await _queue.deliver_once(bot)
            except Exception as exc:
                LOG.error('Operations worker failed class=%s',type(exc).__name__)
            await asyncio.sleep(2)
    _task = asyncio.create_task(worker(),name='safe-operations-delivery')


async def stop():
    global _task
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None


def record_sync(kind, event_id=None):
    global capture_failures
    if not _requested:
        return
    try:
        if _queue is None:
            raise RuntimeError('queue_unavailable')
        _queue.add(kind,event_id)
    except Exception as exc:
        capture_failures += 1
        LOG.error('Operations capture failed class=%s total=%s',type(exc).__name__,capture_failures)


class TelegramBadRequest(Exception): pass
class TelegramForbiddenError(Exception): pass
class TelegramUnauthorizedError(Exception): pass
class TelegramDeliveryError(Exception): pass
class TelegramRetryAfter(Exception):
    def __init__(self,seconds): self.retry_after=seconds


class RawBot:
    def __init__(self,token): self.token=token
    def _send(self,params):
        import urllib.request,urllib.error
        from types import SimpleNamespace
        params={k:v for k,v in params.items() if v is not None}
        # No operator console exists for bookmark queries.
        params.pop('reply_markup',None)
        req=urllib.request.Request('https://api.telegram.org/bot'+self.token+'/sendMessage',
            data=json.dumps(params).encode(),headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=15) as response: result=json.load(response)
        except urllib.error.HTTPError as exc:
            try: result=json.load(exc)
            except Exception: raise TelegramDeliveryError() from None
        if not result.get('ok'):
            code=result.get('error_code')
            if code==429: raise TelegramRetryAfter(result.get('parameters',{}).get('retry_after',60))
            error={400:TelegramBadRequest,401:TelegramUnauthorizedError,403:TelegramForbiddenError}.get(code,TelegramDeliveryError)
            raise error()
        return SimpleNamespace(message_id=result['result']['message_id'])
    async def send_message(self,**params):
        return await asyncio.to_thread(self._send,params)


def start_sync(token,project,path):
    global _requested,_queue
    import threading
    _requested=os.getenv('OPERATIONS_ENABLED')=='1'
    if not _requested: return
    try:
        if not token: raise ValueError('token_missing')
        _queue=Queue(path,project)
    except Exception as exc:
        LOG.error('Operations queue unavailable class=%s',type(exc).__name__)
        return
    async def worker():
        bot=RawBot(token)
        while True:
            try: await _queue.deliver_once(bot)
            except Exception as exc: LOG.error('Operations worker failed class=%s',type(exc).__name__)
            await asyncio.sleep(2)
    threading.Thread(target=lambda:asyncio.run(worker()),name='safe-operations-delivery',daemon=True).start()
