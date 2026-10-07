"""Best-effort Telegram notifications. Never log tokens, queries or raw IPs."""
import hashlib
import json
import secrets
import sqlite3
import threading
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


class QueryNotifications:
    def __init__(self, database, token, chat_id, *, sender=None, clock=time.time):
        self.database = Path(database)
        self.database.parent.mkdir(parents=True, exist_ok=True)
        self.token, self.chat_id = token, chat_id
        self.sender = sender or self._send
        self.clock = clock
        self.slots = threading.BoundedSemaphore(2)
        with sqlite3.connect(self.database) as db:
            db.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
            db.execute('INSERT OR IGNORE INTO meta VALUES (?, ?)', ('salt', secrets.token_hex(32)))
            self.salt = db.execute('SELECT value FROM meta WHERE key=?', ('salt',)).fetchone()[0]
            db.execute('CREATE TABLE IF NOT EXISTS events (ts INTEGER, client TEXT, fingerprint TEXT)')
            db.execute('CREATE INDEX IF NOT EXISTS events_ts ON events(ts)')

    def notify(self, payload, client, maximum):
        if not isinstance(payload, dict) or set(payload) != {'query', 'resultCount'}:
            return 400, 'invalid'
        query, count = payload['query'], payload['resultCount']
        if not isinstance(query, str) or not 1 <= len(query.strip()) <= 500 or type(count) is not int or not 0 <= count <= maximum:
            return 400, 'invalid'
        query = query.strip()
        # Suppress common accidentally pasted credentials rather than forward them.
        if any(marker in query.lower() for marker in ['sk-', 'bearer ', 'password=', 'пароль:']):
            return 202, 'suppressed'
        if not self.slots.acquire(blocking=False):
            return 429, 'busy'
        try:
            now = int(self.clock())
            who = hashlib.sha256((self.salt + client).encode()).hexdigest()
            fingerprint = hashlib.sha256((self.salt + query.casefold()).encode()).hexdigest()
            with sqlite3.connect(self.database, timeout=3) as db:
                db.execute('BEGIN IMMEDIATE')
                db.execute('DELETE FROM events WHERE ts < ?', (now - 172800,))
                if db.execute('SELECT 1 FROM events WHERE client=? AND fingerprint=? AND ts>?', (who, fingerprint, now - 600)).fetchone():
                    return 202, 'duplicate'
                recent = db.execute('SELECT count(*) FROM events WHERE client=? AND ts>?', (who, now - 60)).fetchone()[0]
                day = now - now % 86400
                personal = db.execute('SELECT count(*) FROM events WHERE client=? AND ts>=?', (who, day)).fetchone()[0]
                total = db.execute('SELECT count(*) FROM events WHERE ts>=?', (day,)).fetchone()[0]
                if recent >= 5 or personal >= 20 or total >= 100:
                    return 429, 'limited'
                # Reserve before sending: limits survive failures and process restarts.
                db.execute('INSERT INTO events VALUES (?,?,?)', (now, who, fingerprint))
            date = datetime.fromtimestamp(now, timezone.utc).strftime('%d.%m.%Y %H:%M UTC')
            message = f'Закладки · новый запрос\n\n«{query}»\n\nНайдено: {count} ссылок\n{date}'
            try:
                self.sender(message)
            except Exception:
                print('Query notification: delivery_failed', flush=True)
                return 503, 'delivery_failed'
            return 202, 'sent'
        finally:
            self.slots.release()

    def _send(self, message):
        body = json.dumps({'chat_id': self.chat_id, 'text': message,
                           'link_preview_options': {'is_disabled': True}}, ensure_ascii=False).encode()
        request = urllib.request.Request('https://api.telegram.org/bot' + self.token + '/sendMessage',
                                         data=body, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=5) as response:
            if not json.load(response).get('ok'):
                raise RuntimeError('delivery_failed')
